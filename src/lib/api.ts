const API_BASE_URL = "https://challenge.crossmint.com/api/";

export enum Operation {
  POST = "POST",
  DELETE = "DELETE",
}

export enum NodeType {
  SPACE = -1,
  POLYANET = 0,
}

export interface MapNode {
  type: NodeType;
  row: number;
  column: number;
}

function parseMap(rawMap: (string | { type: number } | null)[][]): MapNode[] {
  const map: MapNode[] = [];

  for (let row = 0; row < rawMap.length; row++) {
    for (let col = 0; col < rawMap[row].length; col++) {
      const targetNode = rawMap[row][col];
      let nodeType: NodeType;

      if (targetNode == null) {
        // null -> SPACE
        nodeType = NodeType.SPACE;
      } else if (typeof targetNode === "string") {
        // string -> enum key
        nodeType = NodeType[targetNode as keyof typeof NodeType];
      } else if (typeof targetNode === "object" && "type" in targetNode) {
        // { type: number } -> use numeric value directly
        nodeType = targetNode.type as NodeType;
      } else {
        nodeType = NodeType.SPACE;
      }

      map.push({ type: nodeType, row, column: col });
    }
  }

  return map;
}

export async function getTargetMap(
  candidateId: string,
): Promise<MapNode[] | Error> {
  const url = new URL(`map/${candidateId}/goal`, API_BASE_URL);

  const res = await fetch(url);
  if (!res.ok) {
    return new Error(`Status code: ${res.status}`);
  }

  const jsonBody = await res.json();
  if (jsonBody.error != null) {
    return new Error(jsonBody.message);
  }

  const result = jsonBody.goal;
  return parseMap(result);
}

export async function getCurrentMap(
  candidateId: string,
): Promise<MapNode[] | Error> {
  const url = new URL(`map/${candidateId}`, API_BASE_URL);

  const res = await fetch(url);
  if (!res.ok) {
    return new Error(`Status code: ${res.status}`);
  }

  const jsonBody = await res.json();
  if (jsonBody.error != null) {
    return new Error(jsonBody.message);
  }

  const result = jsonBody.map.content;
  return parseMap(result);
}

export function computeDelta(
  current: MapNode[],
  target: MapNode[],
): [Operation, MapNode][] | Error {
  /**
   * Returns the difference between current and target
   *
   * @remarks
   * Both parameters MUST be sorted by row then column! This is the case for
   * getTargetMap and getCurrentMap, but be advised.
   *
   * @param current - the map as exists at the moment
   * @param target  - the map we wish to be :)
   *
   * @returns an array of tuples containing the verb to execute and the type of node
   */

  const delta: [Operation, MapNode][] = [];

  if (current.length != target.length) {
    return new Error("Current and target do not match in length.");
  }

  for (let i = 0; i < current.length; i++) {
    if (
      current[i].row != target[i].row || current[i].column != target[i].column
    ) {
      return new Error("Arrays aren't sorted!");
    }

    if (current[i].type != target[i].type) {
      if (current[i].type != NodeType.SPACE) {
        delta.push([Operation.DELETE, current[i]]);
      }
      if (target[i].type != NodeType.SPACE) {
        delta.push([Operation.POST, target[i]]);
      }
    }
  }

  return delta;
}

async function submitPolyanet(
  candidateId: string,
  op: Operation,
  row: number,
  column: number,
): Promise<undefined | Error> {
  const urlPolyanets = new URL(`polyanets`, API_BASE_URL);

  console.log(op.toString());
  const res = await fetch(urlPolyanets, {
    method: op.toString(),
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      candidateId: candidateId,
      row: row,
      column: column,
    }),
  });

  if (!res.ok) {
    return new Error(`Status code: ${res.status}`);
  }
  const jsonBody = await res.json();
  if (jsonBody.error == true) {
    return new Error(jsonBody.message);
  }

  // All went gucci
  return undefined;
}

export async function submit(
  candidateId: string,
  ops: [Operation, MapNode][],
): Promise<undefined | Error> {
  for (let i = 0; i < ops.length; i++) {
    const verb = ops[i][0];
    const node = ops[i][1];

    try {
      if (node.type == NodeType.POLYANET) {
        const err = await submitPolyanet(
          candidateId,
          verb,
          node.row,
          node.column,
        );
        if (err != null) {
          throw err;
        }
      }
    } catch (e) {
      if (!(e instanceof Error)) {
        return e as Error;
      }

      if (e.message == "Status code: 429") {
        i--;
        // this is poor man's "sleep"
        await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
        continue;
      }
    }
  }

  return undefined;
}

const API_BASE_URL = "https://challenge.crossmint.com/api/";

export enum Operation {
  POST = "POST",
  DELETE = "DELETE",
}

export enum NodeType {
  SPACE = -1,
  POLYANET = 0,
  SOLOON = 1,
  COMETH = 2,
}

export enum SoloonColor {
  BLUE,
  RED,
  PURPLE,
  WHITE,
}

export enum ComethDirection {
  UP,
  DOWN,
  RIGHT,
  LEFT,
}

export interface MapNode {
  type: NodeType;
  row: number;
  column: number;
  prop?: SoloonColor | ComethDirection;
}

function parseMap(
  rawMap:
    (string | { type: number; direction?: string; color?: string } | null)[][],
): MapNode[] {
  const map: MapNode[] = [];

  for (let row = 0; row < rawMap.length; row++) {
    for (let col = 0; col < rawMap[row].length; col++) {
      const targetNode = rawMap[row][col];
      let nodeType: NodeType = NodeType.SPACE;
      let prop: SoloonColor | ComethDirection | undefined = undefined;

      if (targetNode == null) {
        nodeType = NodeType.SPACE;
      } else if (typeof targetNode === "string") {
        // Example: "RED_SOLOON" or "UP_COMETH"
        const parts = targetNode.split("_");
        if (parts.length === 2) {
          const [prefix, typeName] = parts;
          if (typeName === "SOLOON") {
            nodeType = NodeType.SOLOON;
            const colorKey = prefix.toUpperCase() as keyof typeof SoloonColor;
            if (colorKey in SoloonColor) prop = SoloonColor[colorKey];
          } else if (typeName === "COMETH") {
            nodeType = NodeType.COMETH;
            const dirKey = prefix.toUpperCase() as keyof typeof ComethDirection;
            if (dirKey in ComethDirection) prop = ComethDirection[dirKey];
          } else {
            nodeType = NodeType.SPACE;
          }
        } else {
          // plain enum member name
          const key = targetNode.toUpperCase() as keyof typeof NodeType;
          if (key in NodeType) nodeType = NodeType[key];
        }
      } else if (typeof targetNode === "object" && "type" in targetNode) {
        // Object form
        nodeType = targetNode.type as NodeType;
        if ("direction" in targetNode && targetNode.direction) {
          const dirKey = (targetNode.direction as string)
            .toUpperCase() as keyof typeof ComethDirection;
          if (dirKey in ComethDirection) prop = ComethDirection[dirKey];
        } else if ("color" in targetNode && targetNode.color) {
          const colorKey = (targetNode.color as string)
            .toUpperCase() as keyof typeof SoloonColor;
          if (colorKey in SoloonColor) prop = SoloonColor[colorKey];
        }
      }

      map.push({
        type: nodeType,
        row,
        column: col,
        ...(prop !== undefined ? { prop } : {}),
      });
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

async function submitCelestialBody(
  url: URL,
  candidateId: string,
  op: Operation,
  row: number,
  column: number,
  prop: Record<string, unknown> | undefined = undefined,
): Promise<undefined | Error> {
  const res = await fetch(url, {
    method: op.toString(),
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      candidateId: candidateId,
      row: row,
      column: column,
      ...(prop ? prop : {}),
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

async function submitPolyanet(
  candidateId: string,
  op: Operation,
  row: number,
  column: number,
): Promise<undefined | Error> {
  const urlPolyanets = new URL(`polyanets`, API_BASE_URL);

  return await submitCelestialBody(urlPolyanets, candidateId, op, row, column);
}

async function submitSoloon(
  candidateId: string,
  op: Operation,
  row: number,
  column: number,
  color: SoloonColor,
): Promise<undefined | Error> {
  const urlSoloons = new URL(`soloons`, API_BASE_URL);
  const colorText = SoloonColor[color];

  return await submitCelestialBody(
    urlSoloons,
    candidateId,
    op,
    row,
    column,
    { color: colorText.toString().toLowerCase() },
  );
}

async function submitCometh(
  candidateId: string,
  op: Operation,
  row: number,
  column: number,
  direction: ComethDirection,
): Promise<undefined | Error> {
  const urlComeths = new URL(`comeths`, API_BASE_URL);
  const directionText = ComethDirection[direction];
  return await submitCelestialBody(
    urlComeths,
    candidateId,
    op,
    row,
    column,
    { direction: directionText.toString().toLowerCase() },
  );
}

export async function submit(
  candidateId: string,
  ops: [Operation, MapNode][],
): Promise<undefined | Error> {
  for (let i = 0; i < ops.length; i++) {
    const verb = ops[i][0];
    const node = ops[i][1];

    try {
      let err: Error | undefined = undefined;
      if (node.type == NodeType.POLYANET) {
        err = await submitPolyanet(
          candidateId,
          verb,
          node.row,
          node.column,
        );
      } else if (node.type == NodeType.SOLOON) {
        err = await submitSoloon(
          candidateId,
          verb,
          node.row,
          node.column,
          node.prop as SoloonColor,
        );
      } else if (node.type == NodeType.COMETH) {
        err = await submitCometh(
          candidateId,
          verb,
          node.row,
          node.column,
          node.prop as ComethDirection,
        );
      }
      if (err != null) {
        throw err;
      }
    } catch (e) {
      if (!(e instanceof Error)) {
        return e as Error;
      }

      if (e.message == "Status code: 429") {
        i--;
        // this is the poor man's "sleep"
        // I don't know how long the rate limit lasts since it is not
        // documented, so the sleep length is a magic number
        await new Promise((resolve) => setTimeout(resolve, 5 * 1000));
        continue;
      } else {
        return e;
      }
    }
  }

  return undefined;
}

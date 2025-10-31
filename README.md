# Crossmint Coding Challenge!
I could talk a lot about the challenge, but you already know about it. For your
eyes only.

## Running
Requires Deno (tested on 2.4.4).

````
CANDIDATE_ID="your-id-here" deno run main
````
That's it!

## Features
* (Mostly) self documenting code.
* No dependencies.
* Automatic map delta calculation; update only what we need.
* `deno run main` idempotency! No requests will be made if there is nothing to change.
* Automatic error 429 (rate limit) recovery

import type { RequestHandler } from "express";

export function actorMiddleware(): RequestHandler {
  return (_req, _res, next) => {
    _req.actor = {
      type: "board",
      userId: "local-board",
      isInstanceAdmin: true,
      source: "local_implicit",
    };

    const runIdHeader = _req.header("x-openblock-run-id");
    if (runIdHeader) _req.actor.runId = runIdHeader;

    next();
  };
}

export function requireBoard(req: Express.Request) {
  return req.actor.type === "board";
}

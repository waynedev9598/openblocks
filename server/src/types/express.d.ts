export {};

declare global {
  namespace Express {
    interface Request {
      actor: {
        type: "board" | "none";
        userId?: string;
        companyId?: string;
        companyIds?: string[];
        isInstanceAdmin?: boolean;
        runId?: string;
        source?: "local_implicit" | "session" | "none";
      };
    }
  }
}

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { companiesApi } from "../api/companies";
import { blocksApi } from "../api/blocks";
import { queryKeys } from "../lib/queryKeys";
import { PageSkeleton } from "../components/PageSkeleton";
import { EmptyState } from "../components/EmptyState";
import { Blocks } from "lucide-react";

export function BlocksSettings() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();

  useEffect(() => {
    setBreadcrumbs([{ label: "Blocks" }]);
  }, [setBreadcrumbs]);

  const availableQuery = useQuery({
    queryKey: queryKeys.blocks.available,
    queryFn: () => blocksApi.listAvailable(),
  });

  const enabledQuery = useQuery({
    queryKey: queryKeys.blocks.enabled(selectedCompanyId ?? ""),
    queryFn: () => companiesApi.listEnabledBlocks(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const enableMutation = useMutation({
    mutationFn: (blockName: string) =>
      companiesApi.enableBlock(selectedCompanyId!, blockName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blocks.enabled(selectedCompanyId!) });
    },
  });

  const disableMutation = useMutation({
    mutationFn: (blockName: string) =>
      companiesApi.disableBlock(selectedCompanyId!, blockName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blocks.enabled(selectedCompanyId!) });
    },
  });

  if (!selectedCompanyId) {
    return <EmptyState icon={Blocks} message="Select a workspace to manage blocks." />;
  }

  if (availableQuery.isLoading || enabledQuery.isLoading) {
    return <PageSkeleton variant="list" />;
  }

  const available = availableQuery.data ?? [];
  const enabledSet = new Set(enabledQuery.data ?? []);

  if (available.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">Blocks</h1>
        <EmptyState
          icon={Blocks}
          message="No blocks installed. Add a block to the blocks/ directory to get started."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Blocks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enable or disable blocks for this workspace.
        </p>
      </div>

      <div className="space-y-2">
        {available.map((block) => {
          const enabled = enabledSet.has(block.name);
          const toggling =
            (enableMutation.isPending && enableMutation.variables === block.name) ||
            (disableMutation.isPending && disableMutation.variables === block.name);

          return (
            <div
              key={block.name}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{block.displayName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {block.description}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  v{block.version}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                disabled={toggling}
                onClick={() =>
                  enabled
                    ? disableMutation.mutate(block.name)
                    : enableMutation.mutate(block.name)
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  enabled ? "bg-primary" : "bg-input"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${
                    enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

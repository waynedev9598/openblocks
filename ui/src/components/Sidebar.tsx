import {
  Inbox,
  CircleDot,
  Target,
  LayoutDashboard,
  History,
  Search,
  SquarePen,
  FileText,
  Blocks,
  Kanban,
  List,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SidebarSection } from "./SidebarSection";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarProjects } from "./SidebarProjects";
import { useDialog } from "../context/DialogContext";
import { useCompany } from "../context/CompanyContext";
import { Button } from "@/components/ui/button";
import { getBlockRegistry } from "../block-registry";
import { companiesApi } from "../api/companies";
import { queryKeys } from "../lib/queryKeys";

const BLOCK_ICONS: Record<string, LucideIcon> = {
  Blocks,
  Kanban,
  List,
  FileText,
  Target,
  CircleDot,
  History,
  Inbox,
};

function resolveBlockIcon(iconName: string): LucideIcon {
  return BLOCK_ICONS[iconName] ?? Blocks;
}

export function Sidebar() {
  const { openNewIssue } = useDialog();
  const { selectedCompany, selectedCompanyId } = useCompany();

  const enabledBlocksQuery = useQuery({
    queryKey: queryKeys.blocks.enabled(selectedCompanyId ?? ""),
    queryFn: () => companiesApi.listEnabledBlocks(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const enabledBlocks = new Set(enabledBlocksQuery.data ?? []);
  const blockRegistry = getBlockRegistry().filter((b) => enabledBlocks.has(b.definition.name));

  function openSearch() {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }

  return (
    <aside className="w-60 h-full min-h-0 border-r border-border bg-background flex flex-col">
      <div className="flex items-center gap-1 px-3 h-12 shrink-0">
        {selectedCompany?.brandColor && (
          <div
            className="w-4 h-4 rounded-sm shrink-0 ml-1"
            style={{ backgroundColor: selectedCompany.brandColor }}
          />
        )}
        <span className="flex-1 text-sm font-bold text-foreground truncate pl-1">
          {selectedCompany?.name ?? "Select workspace"}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground shrink-0"
          onClick={openSearch}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-auto-hide flex flex-col gap-4 px-3 py-2">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => openNewIssue()}
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          >
            <SquarePen className="h-4 w-4 shrink-0" />
            <span className="truncate">New Issue</span>
          </button>
          <SidebarNavItem to="/dashboard" label="Dashboard" icon={LayoutDashboard} />
          <SidebarNavItem to="/inbox" label="Inbox" icon={Inbox} />
        </div>

        <SidebarSection label="Work">
          <SidebarNavItem to="/issues" label="Issues" icon={CircleDot} />
          <SidebarNavItem to="/goals" label="Goals" icon={Target} />
        </SidebarSection>

        <SidebarProjects />

        {/* Block nav sections — only enabled blocks */}
        {blockRegistry.map((block) =>
          block.nav.map((section) => (
            <SidebarSection
              key={`${block.definition.name}-${section.section}`}
              label={section.section}
            >
              {section.items.map((item) => (
                <SidebarNavItem
                  key={item.path}
                  to={item.path}
                  label={item.label}
                  icon={resolveBlockIcon(item.icon)}
                />
              ))}
            </SidebarSection>
          )),
        )}

        <SidebarSection label="Workspace">
          <SidebarNavItem to="/documents" label="Docs" icon={FileText} />
          <SidebarNavItem to="/activity" label="Activity" icon={History} />
          <SidebarNavItem to="/blocks" label="Blocks" icon={Blocks} />
        </SidebarSection>
      </nav>
    </aside>
  );
}

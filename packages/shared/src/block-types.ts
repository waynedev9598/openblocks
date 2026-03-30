export interface BlockNavItem {
  label: string;
  path: string;
  icon: string;
}

export interface BlockNavSection {
  section: string;
  items: BlockNavItem[];
}

export interface BlockDefinition {
  name: string;
  displayName: string;
  description: string;
  version: string;
  nav: BlockNavSection[];
  routePrefix: string;
}

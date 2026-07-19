import { useOutletContext } from 'react-router-dom';

export interface AppLayoutContext {
  /** Opens the mobile conversation drawer. No-op visual at md+. */
  openSidebar: () => void;
}

/** Access the layout context (e.g. the mobile drawer toggle) from a routed page. */
export function useAppLayout(): AppLayoutContext {
  return useOutletContext<AppLayoutContext>();
}

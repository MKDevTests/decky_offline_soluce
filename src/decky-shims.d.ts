declare module '@decky/ui' {
  export const ButtonItem: any;
  export const PanelSection: any;
  export const PanelSectionRow: any;
  export const DialogButton: any;
  export const DialogButtonPrimary: any;
  export const DialogButtonSecondary: any;
  export const Focusable: any;
  export const Field: any;
  // TextField is the Steam-Deck-native text input — focus triggers the Steam virtual
  // keyboard cleanly (raw HTML <input> closes the QAM on Deck instead).
  export const TextField: any;
  export function definePlugin(factory: any): any;
  export const Router: {
    Navigate(path: string): void;
    NavigateBack?(): void;
    CloseSideMenus(): void;
    NavigateToExternalWeb?(url: string): void;
  };
  // Navigation is a SEPARATE export — Router.NavigateBack doesn't always exist
  // on all Steam UI builds, while Navigation.NavigateBack does.
  export const Navigation: {
    Navigate?(path: string): void;
    NavigateBack?(): void;
    CloseSideMenus?(): void;
  };
}

declare module '@decky/api' {
  export function callable<TArgs extends any[], TResult>(name: string): (...args: TArgs) => Promise<TResult>;
  export const routerHook: {
    addRoute(path: string, component: any, props?: any): void;
    removeRoute(path: string): void;
    addGlobalComponent(name: string, component: any): void;
    removeGlobalComponent(name: string): void;
  };
  export const toaster: {
    toast(data: { title?: any; body?: any; duration?: number; icon?: any; logo?: any; critical?: boolean; onClick?: () => void }): void;
  };
}

declare module 'react-icons/fa' {
  export const FaBookOpen: any;
}

declare module 'react' {
  export = React;
  namespace React {
    type CSSProperties = any;
    type ReactNode = any;
    function useEffect(effect: any, deps?: any[]): void;
    function useMemo<T>(factory: () => T, deps: any[]): T;
    function useRef<T>(value: T): { current: T };
    function useState<T>(value: T): [T, (next: T | ((current: T) => T)) => void];
  }
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

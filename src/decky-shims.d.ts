declare module '@decky/ui' {
  export const ButtonItem: any;
  export const PanelSection: any;
  export const PanelSectionRow: any;
  export const DialogButton: any;
  export const DialogButtonPrimary: any;
  export const DialogButtonSecondary: any;
  export const Focusable: any;
  export const Field: any;
  export function definePlugin(factory: any): any;
  export const Router: {
    Navigate(path: string): void;
    NavigateBack(): void;
    CloseSideMenus(): void;
    NavigateToExternalWeb?(url: string): void;
  };
}

declare module '@decky/api' {
  export function callable<TArgs extends any[], TResult>(name: string): (...args: TArgs) => Promise<TResult>;
  export const routerHook: {
    addRoute(path: string, component: any, props?: any): void;
    removeRoute(path: string): void;
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

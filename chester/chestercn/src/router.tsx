import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface RouteParams {
  [key: string]: string;
}

interface RouterContextValue {
  path: string;
  params: RouteParams;
  navigate: (path: string) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

/**
 * Parse hash path and extract params
 * Supports patterns like: /game/:id
 */
function parsePath(hash: string): { path: string; segments: string[] } {
  const path = hash.replace(/^#/, "") || "/";
  const segments = path.split("/").filter(Boolean);
  return { path, segments };
}

/**
 * Match a path pattern against the current path
 * Returns params if matched, null otherwise
 */
function matchRoute(pattern: string, currentPath: string): RouteParams | null {
  const patternSegments = pattern.split("/").filter(Boolean);
  const pathSegments = currentPath.split("/").filter(Boolean);

  if (patternSegments.length !== pathSegments.length) {
    return null;
  }

  const params: RouteParams = {};

  for (let i = 0; i < patternSegments.length; i++) {
    const patternPart = patternSegments[i]!;
    const pathPart = pathSegments[i]!;

    if (patternPart.startsWith(":")) {
      // Dynamic segment
      const paramName = patternPart.slice(1);
      params[paramName] = pathPart;
    } else if (patternPart !== pathPart) {
      // Static segment doesn't match
      return null;
    }
  }

  return params;
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => {
    const { path } = parsePath(window.location.hash);
    return path;
  });
  const [params, setParams] = useState<RouteParams>({});

  useEffect(() => {
    const handleHashChange = () => {
      const { path: newPath } = parsePath(window.location.hash);
      setPath(newPath);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = (newPath: string) => {
    window.location.hash = newPath;
  };

  return (
    <RouterContext.Provider value={{ path, params, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter(): RouterContextValue {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter must be used within RouterProvider");
  }
  return context;
}

interface RouteProps {
  path: string;
  component: React.ComponentType<{ params: RouteParams }>;
}

interface RoutesProps {
  children: ReactNode;
}

export function Routes({ children }: RoutesProps) {
  const { path: currentPath } = useRouter();

  // Find matching route among children
  const childArray = Array.isArray(children) ? children : [children];

  for (const child of childArray) {
    if (child && typeof child === "object" && "props" in child) {
      const { path: pattern, component: Component } = child.props as RouteProps;
      const params = matchRoute(pattern, currentPath);
      if (params !== null) {
        return <Component params={params} />;
      }
    }
  }

  // No match - return null or a 404 component
  return null;
}

export function Route({ path, component }: RouteProps) {
  // This component doesn't render directly - it's used by Routes
  return null;
}

/**
 * Navigate programmatically
 */
export function navigate(path: string) {
  window.location.hash = path;
}

/**
 * Link component for navigation
 */
export function Link({
  to,
  children,
  className,
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(to);
  };

  return (
    <a href={`#${to}`} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}

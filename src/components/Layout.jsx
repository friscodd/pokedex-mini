import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";

function Layout() {
  const location = useLocation();
  const screenRef = useRef(null);
  const previousPathRef = useRef(location.pathname);
  const [isBooting, setIsBooting] = useState(() =>
    typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [bootBounds, setBootBounds] = useState(null);
  const [routeTransition, setRouteTransition] = useState(null);

  function getVisibleScreenBounds() {
    const screen = screenRef.current?.getBoundingClientRect();
    if (!screen) return null;

    const left = Math.max(screen.left, 0);
    const top = Math.max(screen.top, 0);
    const right = Math.min(screen.right, window.innerWidth);
    const bottom = Math.min(screen.bottom, window.innerHeight);
    return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
  }

  useLayoutEffect(() => {
    if (!isBooting) return undefined;

    function updateBootBounds() {
      setBootBounds(getVisibleScreenBounds());
    }

    updateBootBounds();
    window.addEventListener("resize", updateBootBounds);
    window.addEventListener("scroll", updateBootBounds, { passive: true });
    return () => {
      window.removeEventListener("resize", updateBootBounds);
      window.removeEventListener("scroll", updateBootBounds);
    };
  }, [isBooting]);

  useLayoutEffect(() => {
    const previousPath = previousPathRef.current;
    previousPathRef.current = location.pathname;

    if (previousPath !== "/" || !location.pathname.startsWith("/pokemon/") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const bounds = getVisibleScreenBounds();
    if (!bounds?.width || !bounds.height) return undefined;

    setRouteTransition({ path: location.pathname, bounds });
    const timeoutId = window.setTimeout(() => setRouteTransition(null), 900);
    return () => window.clearTimeout(timeoutId);
  }, [location.pathname]);

  useEffect(() => {
    if (!isBooting) return undefined;

    const timeoutId = window.setTimeout(() => setIsBooting(false), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [isBooting]);

  return (
    <>
      <div className="app">
        <header className="app-header">
          <Link to="/" className="app-title-link">
            <span className="brand-mark" aria-hidden="true">
              <span />
            </span>
            <span className="brand-copy">
              <strong>POKÉDEX</strong>
              <small>NATIONAL SPECIMEN INDEX</small>
            </span>
          </Link>
          <span className="header-edition">NATIONAL DEX <i /> SYSTEM ONLINE</span>
        </header>
        <div className="device-bezel">
          <main className={`app-screen${isBooting ? " is-booting" : ""}`} ref={screenRef}>
            <Outlet />
          </main>
        </div>
        <footer className="device-footer" aria-hidden="true">
          <span>POKÉMON FIELD DATABASE</span>
          <span className="device-indicators"><i /><i /><i /></span>
        </footer>
      </div>
      {isBooting && bootBounds && bootBounds.width > 0 && bootBounds.height > 0 && (
        <div className="boot-sequence" style={bootBounds} role="status" aria-label="Pokédex starting">
          <div className="boot-shutter boot-shutter-top" />
          <div className="boot-shutter boot-shutter-bottom" />
          <div className="boot-ball" aria-hidden="true">
            <span className="boot-ball-top" />
            <span className="boot-ball-bottom" />
            <span className="boot-ball-band" />
            <span className="boot-ball-button" />
            <span className="boot-ball-glint" />
          </div>
          <span className="boot-label" aria-hidden="true">INITIALIZING NATIONAL DEX</span>
        </div>
      )}
      {routeTransition && (
        <div
          key={routeTransition.path}
          className="route-transition"
          style={routeTransition.bounds}
          aria-hidden="true"
        >
          <div className="route-shutter route-shutter-first" />
          <div className="route-shutter route-shutter-second" />
          <div className="route-ball">
            <span className="route-ball-core" />
          </div>
        </div>
      )}
    </>
  );
}

export default Layout;

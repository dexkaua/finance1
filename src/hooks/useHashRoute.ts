import { useCallback, useEffect, useState } from "react";
import type { Page } from "../types";

const ROUTES: Page[] = ["dashboard", "movimentacoes", "investimentos", "metas", "relatorios"];

function parseHash(): Page {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return (ROUTES as string[]).includes(hash) ? (hash as Page) : "dashboard";
}

/** Roteamento leve baseado em hash — sobrevive a reloads sem servidor. */
export function useHashRoute(): [Page, (page: Page) => void] {
  const [route, setRoute] = useState<Page>(() => parseHash());

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((page: Page) => {
    window.location.hash = `/${page}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return [route, navigate];
}

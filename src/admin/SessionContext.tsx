/**
 * Etat de session de l'administration.
 *
 * Au chargement, on interroge `GET /api/me` : c'est le serveur qui fait foi.
 * Un 401 n'est pas une erreur, c'est simplement « pas connecte » — l'ecran de
 * connexion s'affiche. On ne conserve que l'affichage de l'utilisateur, la
 * session elle-meme vit dans le cookie httpOnly.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, type AdminUser } from "./api";

interface SessionValue {
  user: AdminUser | null;
  /** true pendant la verification initiale : evite d'afficher le login a tort. */
  checking: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .me()
      .then((data) => {
        if (alive) setUser(data.user);
      })
      .catch((error) => {
        // 401 = session absente (normal au premier chargement). Autre erreur :
        // le serveur est peut-etre arrete, on le signale en restant deconnecte.
        if (alive && !(error instanceof ApiError)) {
          console.warn("Verification de session impossible :", error);
        }
        if (alive) setUser(null);
      })
      .finally(() => {
        if (alive) setChecking(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login(email, password);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  return (
    <SessionContext.Provider value={{ user, checking, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession doit etre utilise dans <SessionProvider>.");
  return value;
}

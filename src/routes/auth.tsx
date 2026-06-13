import { useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3 } from "lucide-react";
import { signIn, signUp } from "@/lib/auth.functions";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });

  const signInFn = useServerFn(signIn);
  const signUpFn = useServerFn(signUp);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signin") {
        await signInFn({ data: { email, password } });
      } else {
        await signUpFn({ data: { email, password } });
      }
      const redirect = (search as Record<string, string>).redirect || "/";
      navigate({ to: redirect, replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analytics for your websites
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex rounded-md bg-muted p-0.5 mb-5">
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(""); }}
              className={`flex-1 text-xs font-medium py-1.5 rounded transition-colors ${mode === "signin" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(""); }}
              className={`flex-1 text-xs font-medium py-1.5 rounded transition-colors ${mode === "signup" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              Sign up
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-2">
              <span className="w-1 h-3 rounded-full bg-destructive/50 shrink-0"></span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-md bg-background border border-input focus:border-ring focus:outline-none text-sm transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full h-10 px-3 rounded-md bg-background border border-input focus:border-ring focus:outline-none text-sm transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 mt-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? "Please wait…" : mode === "signin" ? "Sign in to Insights" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

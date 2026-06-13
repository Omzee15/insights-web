import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { createSite } from "@/lib/analytics.functions";
import { getCurrentUser } from "@/lib/auth.functions";

export const Route = createFileRoute("/sites/new")({
  component: NewSite,
  loader: async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw redirect({ to: "/auth" });
      }
      return { user };
    } catch (e: any) {
      if (e instanceof Response && e.status === 401) {
        throw redirect({ to: "/auth" });
      }
      throw redirect({ to: "/auth" });
    }
  },
});

function NewSite() {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [generated, setGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://insights.app";
  const snippet = generated
    ? `<script async src="${baseUrl}/p.js" data-id="${generated}"></script>`
    : "";

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await createSite({ data: { name, domain } });
      setGenerated(res.trackingId);
    } catch (err: any) {
      setError(err.message || "Failed to create site");
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Add a website</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate a tracking snippet and paste it into your site's &lt;head&gt;.
          </p>
        </div>

        {!generated ? (
          <form onSubmit={generate} className="rounded-xl border border-border bg-card p-6 space-y-5">
            <div>
              <label className="text-sm font-medium block mb-1.5">Website name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Portfolio"
                required
                className="w-full h-10 px-3 rounded-md bg-background border border-input focus:border-ring focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Domain</label>
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                required
                className="w-full h-10 px-3 rounded-md bg-background border border-input focus:border-ring focus:outline-none text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Don't include https:// or trailing slashes.
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="h-10 px-4 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Generate tracking code
              </button>
              <Link
                to="/sites"
                className="h-10 px-4 text-sm rounded-md border border-border hover:bg-muted flex items-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-3 text-chart-2">
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">Site created</span>
              </div>
              <div className="text-sm text-muted-foreground mb-2">Tracking ID</div>
              <code className="text-base font-mono bg-muted px-3 py-1.5 rounded inline-block">
                {generated}
              </code>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium">Install snippet</h3>
                  <p className="text-xs text-muted-foreground">
                    Paste this into the &lt;head&gt; of every page on {domain || "your site"}.
                  </p>
                </div>
                <button
                  onClick={copy}
                  className="h-8 px-3 text-xs rounded-md border border-border hover:bg-muted flex items-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-card-tile rounded-md p-4 text-xs font-mono overflow-x-auto border border-border">
                <code>{snippet}</code>
              </pre>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigate({ to: "/sites" })}
                className="h-10 px-4 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90"
              >
                Done
              </button>
              <button
                onClick={() => {
                  setGenerated(null);
                  setName("");
                  setDomain("");
                }}
                className="h-10 px-4 text-sm rounded-md border border-border hover:bg-muted"
              >
                Add another
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

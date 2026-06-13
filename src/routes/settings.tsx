import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { getCurrentUser, signOut } from "@/lib/auth.functions";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
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

function SettingsPage() {
  const { user } = Route.useLoaderData();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Settings</h1>
      <div className="max-w-2xl space-y-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-medium mb-4">Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Email</label>
              <input
                readOnly
                defaultValue={user?.email || ""}
                className="w-full h-10 px-3 rounded-md bg-muted border border-input focus:outline-none text-sm text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1.5">Email cannot be changed currently.</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-between">
          <div>
            <h3 className="font-medium mb-1">Account Actions</h3>
            <p className="text-sm text-muted-foreground">Sign out of your account on this device.</p>
          </div>
          <button 
            onClick={handleSignOut}
            className="h-9 px-4 text-sm rounded-md border border-border hover:bg-muted text-foreground"
          >
            Sign out
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}

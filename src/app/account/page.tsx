import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountPanel } from "@/components/account/AccountPanel";
import { AppHeader } from "@/components/AppHeader";
import { currentUser } from "@/server/session";

export const metadata: Metadata = { title: "Tài khoản" };

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return (
    <>
      <AppHeader name={user.name} current="account" />
      <main id="main" className="page">
        <AccountPanel user={user} />
      </main>
    </>
  );
}

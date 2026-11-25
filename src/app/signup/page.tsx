import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { inviteRequired } from "@/server/services/account";
import { currentUser } from "@/server/session";

export const metadata: Metadata = { title: "Đăng ký" };

export default async function SignupPage() {
  if (await currentUser()) redirect("/week");
  return (
    <AuthShell>
      <AuthForm mode="signup" inviteRequired={inviteRequired()} />
    </AuthShell>
  );
}

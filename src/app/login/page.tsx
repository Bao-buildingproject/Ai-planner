import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { currentUser } from "@/server/session";

export const metadata: Metadata = { title: "Đăng nhập" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/week");
  return (
    <AuthShell>
      <AuthForm mode="login" />
    </AuthShell>
  );
}

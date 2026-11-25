import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { WeekApp } from "@/components/week/WeekApp";
import { isValidDateStr, mondayOf, nowInVietnam } from "@/lib/dates";
import { getDb } from "@/server/db";
import { currentUser } from "@/server/session";
import { getWeek } from "@/server/services/tasks";

export const metadata: Metadata = { title: "Tuần của tôi" };

export default async function WeekPage({ searchParams }: PageProps<"/week">) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { d } = await searchParams;
  const now = nowInVietnam();
  const target = typeof d === "string" && isValidDateStr(d) ? d : now.date;
  const monday = mondayOf(target);
  const week = await getWeek(getDb(), user.id, monday);
  return (
    <>
      <AppHeader name={user.name} current="week" />
      <main id="main" className="page">
        <WeekApp initialWeek={week} initialSelected={target} initialNow={now} />
      </main>
    </>
  );
}

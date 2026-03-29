import { requireRole } from "@/lib/auth";
import { listAnnouncementsForRole } from "@/lib/lms/queries";

export default async function StudentAnnouncementsPage() {
  await requireRole(["student", "guardian"]);
  const announcements = await listAnnouncementsForRole("student");

  return (
    <div className="space-y-4">
      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">Student Announcements</h2>
        </div>
        <div className="space-y-2 p-5">
          {announcements.map((announcement) => (
            <article
              key={announcement.id}
              className="rounded-xl border border-[color:var(--border)] bg-white/80 p-3"
            >
              <p className="text-sm font-semibold">{announcement.title}</p>
              <p className="mt-1 text-sm text-slate-600">{announcement.body}</p>
              <p className="mt-2 text-xs text-slate-500">
                {new Date(announcement.created_at).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

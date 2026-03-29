import { createAnnouncementAction } from "@/app/actions/lms";
import { requireRole } from "@/lib/auth";
import { listAnnouncements } from "@/lib/lms/queries";

export default async function AdminNotificationsPage() {
  await requireRole(["admin", "finance", "teacher"]);
  const announcements = await listAnnouncements();

  return (
    <div className="space-y-4">
      <section className="panel p-5">
        <h2 className="section-heading">Create Notification</h2>
        <form action={createAnnouncementAction} className="mt-4 space-y-2">
          <input
            name="title"
            placeholder="Notification title"
            className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
            required
          />
          <textarea
            name="body"
            rows={4}
            placeholder="Message"
            className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
            required
          />
          <input
            name="audience"
            placeholder="Audience roles: student,teacher,guardian,admin"
            defaultValue="student,teacher"
            className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            Publish Notification
          </button>
        </form>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <h2 className="section-heading">Published Notifications</h2>
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

import dynamic from "next/dynamic";
const CoursesWorkspace = dynamic(
  () => import("@/components/admin/courses-workspace").then((m) => m.CoursesWorkspace),
  { loading: () => <div className="min-h-[200px] p-6">Loading courses…</div> },
);
import { requireRole } from "@/lib/auth";
import {
  listAllCourseEnrollments,
  listAllCourses,
  listStudents,
  listTeacherUsers,
} from "@/lib/lms/queries";

export default async function AdminCoursesPage() {
  await requireRole(["admin"]);

  const [courses, teachers, students, enrollments] = await Promise.all([
    listAllCourses(),
    listTeacherUsers(),
    listStudents(),
    listAllCourseEnrollments(),
  ]);

  return (
    <CoursesWorkspace
      courses={courses}
      teachers={teachers}
      students={students}
      enrollments={enrollments}
    />
  );
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  } else if (user.role === "OPERATIONS_STAFF") {
    redirect("/waybills");
  } else {
    redirect("/dashboard");
  }
}

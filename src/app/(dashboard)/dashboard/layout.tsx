// app/layout.tsx

import DashboardContextProvider from "@/app/context/DashboardContextProvider";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <DashboardContextProvider>{children}</DashboardContextProvider>;
}

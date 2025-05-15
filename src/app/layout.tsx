import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AmplifyClientProvider from "./utils/AmplifyClientProvider";
import ThemeProvider from "./context/ThemeProvider";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "CodeCanvas",
	description: "CodeCanvas platform",
	icons: {
		icon: "/codecanvaslogo.png",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='en'>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<ThemeProvider>
					<AmplifyClientProvider>{children}</AmplifyClientProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}

"use client";
import React from "react";

export default function CanvasLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div
			style={{
				width: "100vw",
				height: "100vh",
				padding: 0,
				margin: 0,
				overflow: "hidden",
				display: "flex",
				flexDirection: "column",
			}}
		>
			{children}
		</div>
	);
}

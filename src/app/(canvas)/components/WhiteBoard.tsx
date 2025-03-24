"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRoom } from "@/app/context/RoomContextProivider";
import {
	getWhiteboard,
	updateWhiteboard,
	subscribeToWhiteboardChanges,
	parseWhiteboardContent,
	addShape,
	updateShape,
	deleteShape,
} from "@/lib/supabaseWhiteboard";
import {
	Stage,
	Layer,
	Rect,
	Circle,
	Line,
	Text,
	Transformer,
} from "react-konva";
import { KonvaShape, WhiteboardContent } from "@/lib/supabase";

// Debounce function to prevent too many updates
const debounce = (func: Function, wait: number) => {
	let timeout: NodeJS.Timeout;
	return function executedFunction(...args: any[]) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
};

const WhiteBoard = () => {
	const { roomId } = useRoom();
	const [whiteboardId, setWhiteboardId] = useState<string | null>(null);
	const [content, setContent] = useState<WhiteboardContent>({
		shapes: [],
		version: 1,
		lastUpdated: new Date().toISOString(),
	});
	const [loading, setLoading] = useState(true);
	const isLocalChange = useRef(true);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [tool, setTool] = useState<
		"select" | "rectangle" | "circle" | "line" | "text"
	>("select");
	const [isDrawing, setIsDrawing] = useState(false);
	const [newLine, setNewLine] = useState<number[]>([]);
	const stageRef = useRef<any>(null);
	const layerRef = useRef<any>(null);
	const transformerRef = useRef<any>(null);

	// Load and subscribe to whiteboard
	useEffect(() => {
		let subscription: any = null;

		const loadWhiteboard = async () => {
			try {
				setLoading(true);
				console.log("Loading whiteboard for room:", roomId);
				const whiteboard = await getWhiteboard(roomId);

				if (whiteboard) {
					setWhiteboardId(whiteboard.id);
					// Parse the content
					const parsedContent = parseWhiteboardContent(whiteboard.content);
					setContent(parsedContent);

					// Subscribe to changes
					subscription = subscribeToWhiteboardChanges(
						whiteboard.id,
						(updatedWhiteboard) => {
							console.log("Received whiteboard update");
							isLocalChange.current = false;
							const updatedContent = parseWhiteboardContent(updatedWhiteboard.content);
							setContent(updatedContent);
							// Reset selected shape when whiteboard is updated
							setSelectedId(null);
						}
					);
				} else {
					console.error("Failed to load or create whiteboard");
				}
			} catch (error) {
				console.error("Error in whiteboard setup:", error);
			} finally {
				setLoading(false);
			}
		};

		if (roomId) {
			loadWhiteboard();
		}

		// Cleanup subscription
		return () => {
			if (subscription) {
				console.log("Cleaning up whiteboard subscription");
				subscription.unsubscribe();
			}
		};
	}, [roomId]);

	// Update transformer on selection change
	useEffect(() => {
		if (selectedId && transformerRef.current) {
			// Find the corresponding node by id
			const node = layerRef.current?.findOne(`#${selectedId}`);
			if (node) {
				// Attach transformer to selected node
				transformerRef.current.nodes([node]);
				transformerRef.current.getLayer().batchDraw();
			}
		} else if (transformerRef.current) {
			// Detach transformer
			transformerRef.current.nodes([]);
			transformerRef.current.getLayer().batchDraw();
		}
	}, [selectedId, content.shapes]);

	// Save whiteboard content with debounce
	const saveContent = useRef(
		debounce(async (newContent: WhiteboardContent) => {
			if (!whiteboardId || !isLocalChange.current) {
				isLocalChange.current = true;
				return;
			}

			console.log("Saving whiteboard content");
			try {
				await updateWhiteboard(whiteboardId, JSON.stringify(newContent));
			} catch (error) {
				console.error("Error saving whiteboard content:", error);
			}
		}, 500)
	).current;

	// Add a new shape to whiteboard
	const handleAddShape = async (shape: Omit<KonvaShape, "id">) => {
		if (!whiteboardId) return;

		isLocalChange.current = true;
		const newShape = { ...shape, id: `temp-${Date.now()}` } as KonvaShape;

		// Update locally first for immediate feedback
		setContent((prev) => ({
			...prev,
			shapes: [...prev.shapes, newShape],
			version: prev.version + 1,
			lastUpdated: new Date().toISOString(),
		}));

		// Save to Supabase
		try {
			const result = await addShape(whiteboardId, shape);
			if (result) {
				// Update with real ID from server
				const serverContent = parseWhiteboardContent(result.content);
				setContent(serverContent);
			}
		} catch (error) {
			console.error("Error adding shape:", error);
		}
	};

	// Handle shape update
	const handleUpdateShape = async (id: string, updates: Partial<KonvaShape>) => {
		if (!whiteboardId) return;

		isLocalChange.current = true;

		// Update locally first
		setContent((prev) => {
			const newShapes = prev.shapes.map((s) =>
				s.id === id ? { ...s, ...updates } : s
			);

			return {
				...prev,
				shapes: newShapes,
				version: prev.version + 1,
				lastUpdated: new Date().toISOString(),
			};
		});

		// Save to Supabase with debounce
		saveContent(content);
	};

	// Handle shape deletion
	const handleDeleteShape = async (id: string) => {
		if (!whiteboardId) return;

		isLocalChange.current = true;
		setSelectedId(null);

		// Update locally first
		setContent((prev) => ({
			...prev,
			shapes: prev.shapes.filter((s) => s.id !== id),
			version: prev.version + 1,
			lastUpdated: new Date().toISOString(),
		}));

		// Save to Supabase
		try {
			await deleteShape(whiteboardId, id);
		} catch (error) {
			console.error("Error deleting shape:", error);
		}
	};

	// Handle keyboard events
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Delete" && selectedId) {
				handleDeleteShape(selectedId);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [selectedId]);

	// Handle mouse events for drawing
	const handleMouseDown = (e: any) => {
		// Deselect when clicked on empty area
		const clickedOnEmpty = e.target === e.target.getStage();
		if (clickedOnEmpty) {
			setSelectedId(null);
		}

		// Start drawing for line tool
		if (tool === "line") {
			setIsDrawing(true);
			const pos = e.target.getStage().getPointerPosition();
			setNewLine([pos.x, pos.y]);
		}
	};

	const handleMouseMove = (e: any) => {
		// No drawing - skipping
		if (!isDrawing) {
			return;
		}

		// Drawing line
		if (tool === "line") {
			const pos = e.target.getStage().getPointerPosition();
			setNewLine((prevLine) => [...prevLine, pos.x, pos.y]);
		}
	};

	const handleMouseUp = () => {
		// End drawing
		if (isDrawing && tool === "line" && newLine.length > 2) {
			const newLineShape: Omit<KonvaShape, "id"> = {
				type: "line",
				x: 0,
				y: 0,
				points: newLine,
				stroke: "#000",
				strokeWidth: 2,
				draggable: true,
			};

			handleAddShape(newLineShape);
			setNewLine([]);
		}

		setIsDrawing(false);
	};

	// Handle stage click for adding shapes
	const handleStageClick = (e: any) => {
		// Only handle click if tool is not select
		if (tool === "select" || isDrawing) return;

		const stage = e.target.getStage();
		const pos = stage.getPointerPosition();

		// Add shape based on selected tool
		if (tool === "rectangle") {
			const newRect: Omit<KonvaShape, "id"> = {
				type: "rect",
				x: pos.x - 25,
				y: pos.y - 25,
				width: 50,
				height: 50,
				fill: "#89CFF0",
				stroke: "#000",
				strokeWidth: 1,
				draggable: true,
			};
			handleAddShape(newRect);
		} else if (tool === "circle") {
			const newCircle: Omit<KonvaShape, "id"> = {
				type: "circle",
				x: pos.x,
				y: pos.y,
				radius: 25,
				fill: "#FFC0CB",
				stroke: "#000",
				strokeWidth: 1,
				draggable: true,
			};
			handleAddShape(newCircle);
		} else if (tool === "text") {
			const newText: Omit<KonvaShape, "id"> = {
				type: "text",
				x: pos.x,
				y: pos.y,
				text: "Double click to edit",
				fontSize: 16,
				fill: "#000",
				draggable: true,
			};
			handleAddShape(newText);
		}
	};

	// Render shape based on its type
	const renderShape = (shape: KonvaShape) => {
		const isSelected = shape.id === selectedId;

		if (shape.type === "rect") {
			return (
				<Rect
					key={shape.id}
					id={shape.id}
					x={shape.x}
					y={shape.y}
					width={shape.width}
					height={shape.height}
					fill={shape.fill}
					stroke={shape.stroke}
					strokeWidth={shape.strokeWidth}
					draggable={shape.draggable}
					onClick={() => setSelectedId(shape.id)}
					onTap={() => setSelectedId(shape.id)}
					onDragEnd={(e) => {
						handleUpdateShape(shape.id, {
							x: e.target.x(),
							y: e.target.y(),
						});
					}}
					onTransformEnd={(e) => {
						// Transformer changes scale, but we want to change width and height
						const node = e.target;
						handleUpdateShape(shape.id, {
							x: node.x(),
							y: node.y(),
							width: node.width() * node.scaleX(),
							height: node.height() * node.scaleY(),
							// Reset scale
							scaleX: 1,
							scaleY: 1,
						});
					}}
				/>
			);
		} else if (shape.type === "circle") {
			return (
				<Circle
					key={shape.id}
					id={shape.id}
					x={shape.x}
					y={shape.y}
					radius={shape.radius}
					fill={shape.fill}
					stroke={shape.stroke}
					strokeWidth={shape.strokeWidth}
					draggable={shape.draggable}
					onClick={() => setSelectedId(shape.id)}
					onTap={() => setSelectedId(shape.id)}
					onDragEnd={(e) => {
						handleUpdateShape(shape.id, {
							x: e.target.x(),
							y: e.target.y(),
						});
					}}
					onTransformEnd={(e) => {
						const node = e.target;
						handleUpdateShape(shape.id, {
							x: node.x(),
							y: node.y(),
							radius: (node.width() * node.scaleX()) / 2,
							// Reset scale
							scaleX: 1,
							scaleY: 1,
						});
					}}
				/>
			);
		} else if (shape.type === "line") {
			return (
				<Line
					key={shape.id}
					id={shape.id}
					points={shape.points}
					stroke={shape.stroke}
					strokeWidth={shape.strokeWidth}
					draggable={shape.draggable}
					onClick={() => setSelectedId(shape.id)}
					onTap={() => setSelectedId(shape.id)}
					onDragEnd={(e) => {
						handleUpdateShape(shape.id, {
							x: e.target.x(),
							y: e.target.y(),
						});
					}}
				/>
			);
		} else if (shape.type === "text") {
			return (
				<Text
					key={shape.id}
					id={shape.id}
					x={shape.x}
					y={shape.y}
					text={shape.text}
					fontSize={shape.fontSize}
					fill={shape.fill}
					draggable={shape.draggable}
					onClick={() => setSelectedId(shape.id)}
					onTap={() => setSelectedId(shape.id)}
					onDragEnd={(e) => {
						handleUpdateShape(shape.id, {
							x: e.target.x(),
							y: e.target.y(),
						});
					}}
					onDblClick={(e) => {
						const text = prompt("Enter new text:", shape.text) || shape.text;
						handleUpdateShape(shape.id, { text });
					}}
				/>
			);
		}

		return null;
	};

	if (loading) {
		return (
			<div className='h-full w-full flex items-center justify-center bg-gray-100'>
				<div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'></div>
				<span className='ml-3'>Loading whiteboard...</span>
			</div>
		);
	}

	return (
		<div className='h-full w-full bg-white border-slate-200 border flex flex-col'>
			<div className='p-2 bg-gray-100 flex justify-between'>
				<div className='flex space-x-2'>
					<button
						className={`px-2 py-1 text-xs rounded ${tool === "select" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
						onClick={() => setTool("select")}
					>
						Select
					</button>
					<button
						className={`px-2 py-1 text-xs rounded ${tool === "rectangle" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
						onClick={() => setTool("rectangle")}
					>
						Rectangle
					</button>
					<button
						className={`px-2 py-1 text-xs rounded ${tool === "circle" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
						onClick={() => setTool("circle")}
					>
						Circle
					</button>
					<button
						className={`px-2 py-1 text-xs rounded ${tool === "line" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
						onClick={() => setTool("line")}
					>
						Line
					</button>
					<button
						className={`px-2 py-1 text-xs rounded ${tool === "text" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
						onClick={() => setTool("text")}
					>
						Text
					</button>
				</div>
				<div className='flex items-center space-x-2'>
					{selectedId && (
						<button
							className='px-2 py-1 text-xs rounded bg-red-500 text-white'
							onClick={() => selectedId && handleDeleteShape(selectedId)}
						>
							Delete
						</button>
					)}
					<div className='text-xs text-gray-500'>ID: {whiteboardId}</div>
				</div>
			</div>

			<div className='flex-grow bg-white'>
				<Stage
					width={window.innerWidth}
					height={window.innerHeight * 0.8}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onClick={handleStageClick}
					ref={stageRef}
				>
					<Layer ref={layerRef}>
						{/* Render the saved shapes */}
						{content.shapes.map((shape) => renderShape(shape))}

						{/* Render the current line being drawn */}
						{isDrawing && tool === "line" && (
							<Line
								points={newLine}
								stroke='#000'
								strokeWidth={2}
							/>
						)}

						{/* Transformer for resizing shapes */}
						<Transformer
							ref={transformerRef}
							boundBoxFunc={(oldBox, newBox) => {
								// Limit min size
								if (newBox.width < 5 || newBox.height < 5) {
									return oldBox;
								}
								return newBox;
							}}
						/>
					</Layer>
				</Stage>
			</div>

			<div className='p-2 bg-gray-100 text-xs text-gray-500 flex justify-between'>
				<span>Last updated: {new Date(content.lastUpdated).toLocaleString()}</span>
				<span>Version: {content.version}</span>
			</div>
		</div>
	);
};

export default WhiteBoard;

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
	createEmptyContent,
} from "@/lib/supabaseWhiteboard";
import { useAuth } from "@/app/context/AuthProvider";
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
	const { refreshAuth } = useAuth();
	const [whiteboardId, setWhiteboardId] = useState<number | null>(null);
	const [content, setContent] = useState<WhiteboardContent>({
		shapes: [],
		version: 1,
		lastUpdated: new Date().toISOString(),
	});
	const [roomIdWhiteboard, setRoomIdWhiteboard] = useState<
		string | number | null
	>(null);
	const [loading, setLoading] = useState(true);
	const isLocalChange = useRef(true);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [tool, setTool] = useState<
		"select" | "rectangle" | "circle" | "line" | "text" | "eraser"
	>("select");
	const [isDrawing, setIsDrawing] = useState(false);
	const [newLine, setNewLine] = useState<number[]>([]);
	const stageRef = useRef<any>(null);
	const layerRef = useRef<any>(null);
	const transformerRef = useRef<any>(null);
	const [cursorPosition, setCursorPosition] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [eraserSize, setEraserSize] = useState(20);

	// Load and subscribe to whiteboard
	useEffect(() => {
		let subscription: any = null;
		const roomIdString = roomId?.toString() || "";
		setRoomIdWhiteboard(roomIdString);
		const loadWhiteboard = async () => {
			try {
				setLoading(true);

				// Refresh auth before loading whiteboard
				await refreshAuth();

				const whiteboard = await getWhiteboard(roomIdString);

				if (whiteboard) {
					setWhiteboardId(whiteboard.id);

					// Parse the content - handle both string and object
					let parsedContent: WhiteboardContent;
					if (typeof whiteboard.content === "string") {
						parsedContent = parseWhiteboardContent(whiteboard.content);
					} else if (
						typeof whiteboard.content === "object" &&
						whiteboard.content !== null
					) {
						// Already an object, validate structure
						const objContent = whiteboard.content as any;
						parsedContent = objContent.shapes
							? (objContent as WhiteboardContent)
							: createEmptyContent();
					} else {
						parsedContent = createEmptyContent();
					}

					setContent(parsedContent);

					// Subscribe to changes
					subscription = subscribeToWhiteboardChanges(
						whiteboard.id,
						(updatedWhiteboard) => {
							isLocalChange.current = false;

							// Handle content - could be string or object
							let updatedContent: WhiteboardContent;
							if (typeof updatedWhiteboard.content === "string") {
								updatedContent = parseWhiteboardContent(updatedWhiteboard.content);
							} else if (
								typeof updatedWhiteboard.content === "object" &&
								updatedWhiteboard.content !== null
							) {
								const objContent = updatedWhiteboard.content as any;
								updatedContent = objContent.shapes
									? (objContent as WhiteboardContent)
									: createEmptyContent();
							} else {
								updatedContent = createEmptyContent();
							}

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
				subscription.unsubscribe();
			}
		};
	}, [roomId, refreshAuth]);

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

			try {
				// Refresh auth before saving
				await refreshAuth();
				await updateWhiteboard(whiteboardId, newContent);
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
			// Refresh auth before adding shape
			await refreshAuth();
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

			const newContent = {
				...prev,
				shapes: newShapes,
				version: prev.version + 1,
				lastUpdated: new Date().toISOString(),
			};

			// Save to Supabase with debounce using the updated content
			saveContent(newContent);

			return newContent;
		});
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
		// Update cursor position for eraser
		if (tool === "eraser") {
			const pos = e.target.getStage().getPointerPosition();
			setCursorPosition(pos);
		} else {
			setCursorPosition(null);
		}

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

		// Handle eraser tool
		if (tool === "eraser") {
			eraseAtPosition(pos);
			return;
		}

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
		}
	};

	// Helper functions for eraser
	const dist2 = (v: any, w: any) => {
		return (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
	};

	const distToSegment = (p: any, v: any, w: any) => {
		const l2 = dist2(v, w);
		if (l2 === 0) return Math.sqrt(dist2(p, v));

		let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
		t = Math.max(0, Math.min(1, t));

		return Math.sqrt(
			dist2(p, {
				x: v.x + t * (w.x - v.x),
				y: v.y + t * (w.y - v.y),
			})
		);
	};

	// Function to erase at a specific position
	const eraseAtPosition = (pos: { x: number; y: number }) => {
		if (!layerRef.current || !whiteboardId) return;

		// Find shapes under the eraser
		const shapesToErase: string[] = [];

		// Check each shape
		content.shapes.forEach((shape) => {
			let shouldErase = false;

			if (shape.type === "line" && shape.points) {
				// For lines, check each segment
				for (let i = 0; i < shape.points.length - 2; i += 2) {
					const x1 = shape.points[i] + (shape.x || 0);
					const y1 = shape.points[i + 1] + (shape.y || 0);
					const x2 = shape.points[i + 2] + (shape.x || 0);
					const y2 = shape.points[i + 3] + (shape.y || 0);

					// Calculate distance from point to line segment
					const distance = distToSegment(pos, { x: x1, y: y1 }, { x: x2, y: y2 });

					if (distance < eraserSize) {
						shouldErase = true;
						break;
					}
				}
			} else if (shape.type === "rect" && shape.width && shape.height) {
				// For rectangles
				const { x, y, width, height } = shape;
				if (
					pos.x >= x! - eraserSize &&
					pos.x <= x! + width + eraserSize &&
					pos.y >= y! - eraserSize &&
					pos.y <= y! + height + eraserSize
				) {
					shouldErase = true;
				}
			} else if (shape.type === "circle" && shape.radius) {
				// For circles
				const distance = Math.sqrt(
					Math.pow(pos.x - shape.x!, 2) + Math.pow(pos.y - shape.y!, 2)
				);
				if (distance <= shape.radius + eraserSize) {
					shouldErase = true;
				}
			} else if (shape.type === "text") {
				// For text, use a simple bounding box check
				const node = layerRef.current.findOne(`#${shape.id}`);
				if (node) {
					const bounds = node.getClientRect();
					if (
						pos.x >= bounds.x - eraserSize &&
						pos.x <= bounds.x + bounds.width + eraserSize &&
						pos.y >= bounds.y - eraserSize &&
						pos.y <= bounds.y + bounds.height + eraserSize
					) {
						shouldErase = true;
					}
				}
			}

			if (shouldErase) {
				shapesToErase.push(shape.id);
			}
		});

		// Erase all found shapes
		if (shapesToErase.length > 0) {
			// Mark this as a local change
			isLocalChange.current = true;

			// Create a new content object with filtered shapes
			const newContent = {
				...content,
				shapes: content.shapes.filter((shape) => !shapesToErase.includes(shape.id)),
				version: content.version + 1,
				lastUpdated: new Date().toISOString(),
			};

			// Update local state
			setContent(newContent);

			// Save to Supabase
			saveContent(newContent);

			// Delete each shape from Supabase
			shapesToErase.forEach((id) => {
				deleteShape(whiteboardId!, id).catch((error) => {
					console.error(`Error deleting shape ${id}:`, error);
				});
			});
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
						className={`px-2 py-1 text-xs rounded ${tool === "eraser" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
						onClick={() => setTool("eraser")}
					>
						Eraser
					</button>
				</div>
				<div className='flex items-center space-x-2'>
					{tool === "eraser" && (
						<div className='flex items-center space-x-2'>
							<span className='text-xs'>Size:</span>
							<input
								type='range'
								min='5'
								max='50'
								value={eraserSize}
								onChange={(e) => setEraserSize(parseInt(e.target.value))}
								className='w-20 h-2'
							/>
						</div>
					)}
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
					style={{
						cursor: tool === "eraser" ? "none" : "default",
						touchAction: "none",
					}}
					draggable={tool === "select"}
					dragBoundFunc={(pos) => pos}
					perfectDrawEnabled={false}
					listening={true}
				>
					<Layer ref={layerRef}>
						{content.shapes.map((shape) => renderShape(shape))}

						{/* Render the current line being drawn */}
						{isDrawing && tool === "line" && (
							<Line
								points={newLine}
								stroke='#000'
								strokeWidth={2}
							/>
						)}

						{/* Eraser cursor */}
						{tool === "eraser" && cursorPosition && (
							<Circle
								x={cursorPosition.x}
								y={cursorPosition.y}
								radius={eraserSize}
								fill='rgba(255, 0, 0, 0.2)'
								stroke='red'
								strokeWidth={1}
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

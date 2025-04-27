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
		"select" | "square" | "circle" | "line" | "text" | "eraser" | "view"
	>("select");
	const [isDragging, setIsDragging] = useState(false);
	const [draggedId, setDraggedId] = useState<string | null>(null);
	const [stageWidth, setStageWidth] = useState(window.innerWidth);
	const [stageHeight, setStageHeight] = useState(window.innerHeight * 0.8);
	// Debug: log current tool and selected shape
	useEffect(() => {
		const handleResize = () => {
			setStageWidth(window.innerWidth);
			setStageHeight(window.innerHeight * 0.8);
		};

		// Add event listener
		window.addEventListener("resize", handleResize);

		// Clean up
		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, []);

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
							console.log("Received whiteboard update from server");

							// Set flag to false to indicate this is a remote update
							isLocalChange.current = false;

							// Parse the updated content
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

							// Always update with remote changes, regardless of version
							// This ensures real-time updates even if versions get out of sync
							console.log(
								"Updating whiteboard with remote content. Remote version:",
								updatedContent.version,
								"Local version:",
								content.version
							);

							// Update the shapes without checking versions
							setContent(updatedContent);
							setSelectedId(null);

							// Reset the flag for future updates
							isLocalChange.current = true;
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
			const node = layerRef.current?.findOne(`#${selectedId}`);
			if (node) {
				// Attach transformer to selected node
				transformerRef.current.nodes([node]);
				transformerRef.current.getLayer().batchDraw();

				// Bring selected shape to top for better visibility and interaction
				node.moveToTop();
				transformerRef.current.moveToTop();
			}
		} else if (transformerRef.current) {
			transformerRef.current.nodes([]);
			transformerRef.current.getLayer().batchDraw();
		}
	}, [selectedId]);

	// Add dragDistance setting to Stage ref after it's created
	useEffect(() => {
		if (stageRef.current) {
			// Make dragging more responsive by reducing drag threshold
			stageRef.current.dragDistance(0);
		}
	}, [stageRef]);

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
	// Save whiteboard content with debounce
	const saveContent = useRef(
		debounce(async (newContent: any) => {
			if (!whiteboardId || !isLocalChange.current) {
				isLocalChange.current = true;
				return;
			}

			try {
				// Set a flag to ignore the next update from the server
				// since we already have the changes locally
				const localVersion = newContent.version;

				await refreshAuth();
				const result = await updateWhiteboard(whiteboardId, newContent);

				// If we got a result and the versions match, don't update local state again
				if (
					result &&
					parseWhiteboardContent(result.content).version === localVersion
				) {
					console.log("Local and server versions match, skipping update");
				}
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

	// Handle mouse events for drawing
	const handleMouseDown = (e: any) => {
		// Only deselect when clicking on empty stage area and in select mode
		const clickedOnEmpty = e.target === e.target.getStage();

		if (clickedOnEmpty && tool === "select") {
			setSelectedId(null);
		}

		// For drawing tools
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
		if (tool === "view") return; // Skip all interactions in view mode

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
		if (tool === "view") return; // Skip all interactions in view mode

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

		if (e.target !== e.target.getStage()) {
			return;
		}

		if (tool === "view" || tool === "select" || isDrawing) return;

		const stage = e.target.getStage();
		const pos = stage.getPointerPosition();

		// Handle eraser tool
		if (tool === "eraser") {
			eraseAtPosition(pos);
			return;
		}

		// Add shape based on selected tool
		if (tool === "square") {
			const newRect: Omit<KonvaShape, "id"> = {
				type: "rect", // Changed to "rect" to match Konva's standard shape type
				x: pos.x - 25,
				y: pos.y - 25,
				width: 50,
				height: 50,
				fill: "#89CFF0",
				stroke: "#FF0000",
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
				// For rectangles (squares in UI)
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
		// Use the draggable property from the shape itself, no need to calculate

		const isSelected = shape.id === selectedId;
		const isBeingDragged = shape.id === draggedId && isDragging;
		const sharedProps = {
			id: shape.id,
			x: shape.x || 0, // Provide fallbacks for all properties
			y: shape.y || 0,
			onClick: (e: any) => {
				e.cancelBubble = true; // Stop event propagation
				if (tool === "select") {
					setSelectedId(shape.id);
				}
			},
			onTap: (e: any) => {
				e.cancelBubble = true; // Stop event propagation
				if (tool === "select") {
					setSelectedId(shape.id);
				}
			},
			onDragStart: (e: any) => {
				e.target.setAttrs({
					shadowOffset: { x: 5, y: 5 },
					shadowBlur: 10,
					shadowColor: "rgba(0,0,0,0.3)",
					shadowOpacity: 0.5,
				});
			},
			onDragEnd: (e: any) => {
				e.target.setAttrs({
					shadowOffset: { x: 0, y: 0 },
					shadowBlur: 0,
					shadowOpacity: 0,
				});

				handleUpdateShape(shape.id, {
					x: e.target.x(),
					y: e.target.y(),
				});
			},
		};
		if (shape.type === "rect") {
			return (
				<Rect
					{...sharedProps}
					key={shape.id}
					draggable={tool === "select"}
					width={shape.width || 50}
					height={shape.height || 50}
					fill={shape.fill || "#89CFF0"}
					stroke={shape.stroke || "#000"}
					strokeWidth={shape.strokeWidth || 1}
					onClick={(e) => {
						console.log("🛠️ [Rect] onClick:", shape.id, "tool:", tool);
						if (tool === "select") {
							setSelectedId(shape.id);
						}
					}}
					onMouseEnter={() => {
						console.log("🛠️ [Rect] onMouseEnter:", shape.id);
					}}
					onDragStart={(e) => {
						console.log(
							"🛠️ [Rect] onDragStart:",
							shape.id,
							"tool:",
							tool,
							"draggable:",
							tool === "select"
						);
						setIsDragging(true);
						setDraggedId(shape.id);

						// Hide transformer during drag to prevent interference
						if (transformerRef.current) {
							transformerRef.current.nodes([]);
							transformerRef.current.getLayer()?.batchDraw();
						}

						e.target.setAttrs({
							shadowOffset: { x: 5, y: 5 },
							shadowBlur: 10,
							shadowColor: "rgba(0,0,0,0.3)",
							shadowOpacity: 0.5,
						});
					}}
					onDragEnd={(e) => {
						console.log(
							"🛠️ [Rect] onDragEnd:",
							shape.id,
							"tool:",
							tool,
							"draggable:",
							tool === "select"
						);
						setIsDragging(false);
						setDraggedId(null);

						e.target.setAttrs({
							shadowOffset: { x: 0, y: 0 },
							shadowBlur: 0,
							shadowOpacity: 0,
						});

						// Update position
						handleUpdateShape(shape.id, {
							x: e.target.x(),
							y: e.target.y(),
						});

						// Restore transformer after drag
						if (transformerRef.current && selectedId) {
							const node = layerRef.current?.findOne(`#${selectedId}`);
							if (node) {
								transformerRef.current.nodes([node]);
								transformerRef.current.getLayer()?.batchDraw();
							}
						}
					}}
					onTransformEnd={(e) => {
						const node = e.target;
						handleUpdateShape(shape.id, {
							x: node.x(),
							y: node.y(),
							width: Math.max(5, node.width() * node.scaleX()),
							height: Math.max(5, node.height() * node.scaleY()),
							scaleX: 1,
							scaleY: 1,
						});
					}}
				/>
			);
		} else if (shape.type === "circle") {
			// Debug: log render conditions for Circle
			console.log(
				`🛠️ [Circle render] id=${shape.id}, tool=${tool}, draggable=${tool === "select"}`
			);
			return (
				<Circle
					{...sharedProps}
					key={shape.id}
					draggable={tool === "select"}
					radius={shape.radius}
					fill={isBeingDragged ? "#B3E5FC" : shape.fill} // Highlight while dragging
					stroke={isSelected ? "#2196F3" : shape.stroke} // Highlight when selected
					strokeWidth={isSelected ? 2 : shape.strokeWidth}
					onClick={(e) => {
						console.log("🛠️ [Circle] onClick:", shape.id, "tool:", tool);
						if (tool === "select") {
							setSelectedId(shape.id);
						}
					}}
					onMouseEnter={() => {
						console.log("🛠️ [Circle] onMouseEnter:", shape.id);
					}}
					onTap={() => {
						if (tool === "select") setSelectedId(shape.id);
					}}
					onDragStart={(e) => {
						console.log(
							"🛠️ [Circle] onDragStart:",
							shape.id,
							"tool:",
							tool,
							"draggable:",
							tool === "select"
						);
						setIsDragging(true);
						setDraggedId(shape.id);

						// Hide transformer during drag to prevent interference
						if (transformerRef.current) {
							transformerRef.current.nodes([]);
							transformerRef.current.getLayer()?.batchDraw();
						}
					}}
					onDragEnd={(e) => {
						console.log(
							"🛠️ [Circle] onDragEnd:",
							shape.id,
							"tool:",
							tool,
							"draggable:",
							tool === "select"
						);
						setIsDragging(false);
						setDraggedId(null);

						// Update position
						handleUpdateShape(shape.id, {
							x: e.target.x(),
							y: e.target.y(),
						});

						// Restore transformer after drag
						if (transformerRef.current && selectedId) {
							const node = layerRef.current?.findOne(`#${selectedId}`);
							if (node) {
								transformerRef.current.nodes([node]);
								transformerRef.current.getLayer()?.batchDraw();
							}
						}
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
					{/* <button
						className={`px-2 py-1 text-xs rounded ${tool === "select" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
						onClick={() => setTool("select")}
					>
						Select
					</button> */}
					{/* <button
						className={`px-2 py-1 text-xs rounded ${tool === "square" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
						onClick={() => setTool("square")}
					>
						Square
					</button> */}
					{/* <button
						className={`px-2 py-1 text-xs rounded ${tool === "circle" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
						onClick={() => setTool("circle")}
					>
						Circle
					</button> */}
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
					<button
						className={`px-2 py-1 text-xs rounded ${tool === "view" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
						onClick={() => setTool("view")}
					>
						View Only
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
					width={stageWidth}
					height={stageHeight}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onClick={handleStageClick}
					ref={stageRef}
					style={{
						cursor: tool === "eraser" ? "none" : "default",
						touchAction: "none",
					}}
					// Disable stage dragging to prevent offset issues
					draggable={false}
					// Remove dragBoundFunc since we're disabling dragging
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

"use client"
import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import CodeEditor from "@/app/(canvas)/components/CodeEditor";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import WhiteBoard from "@/app/(canvas)/components/WhiteBoard";
import Prompt from "@/app/(canvas)/components/Prompt";

const Canvas = () => {
    const params = useParams();
    const [language, setLanguage] = useState("typescript");
    const documentId = params.id as string;

    const handleLanguageChange = (newLanguage: string) => {
        setLanguage(newLanguage);
    };

    return (
        <div className="h-[calc(100vh-120px)] w-full">
            <PanelGroup direction="horizontal">
                <Panel defaultSize={20} minSize={10}>
                    <Prompt/>
                </Panel>
                <PanelResizeHandle className="w-1.5 bg-gray-300 hover:bg-blue-500 transition-colors cursor-col-resize" />

                <Panel defaultSize={60} minSize={20}>
                    <CodeEditor
                        language={language}
                        defaultValue="// Start coding here"
                        documentId={documentId}
                        disableAutocomplete={true}
                        onLanguageChange={handleLanguageChange}
                    />
                </Panel>

                <PanelResizeHandle className="w-1.5 bg-gray-300 hover:bg-blue-500 transition-colors cursor-col-resize" />

                <Panel defaultSize={40} minSize={20}>
                    <WhiteBoard/>
                </Panel>

            </PanelGroup>
        </div>
    );
};

export default Canvas;
"use client"
import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import CodeEditor from "@/app/(canvas)/components/CodeEditor";
import { SplitPane } from '@rexxars/react-split-pane';

const splitPaneStyles = {
    height: '100%',
    position: 'relative' as const,
};

const Canvas = () => {
    const params = useParams();
    const [language, setLanguage] = useState("typescript");
    const documentId = params.id as string;

    const handleLanguageChange = (newLanguage: string) => {
        setLanguage(newLanguage);
    };

    return (
        <div className="h-[calc(100vh-120px)] w-full">
            <SplitPane
                split="vertical"
                minSize={200}
                defaultSize={750}
                style={splitPaneStyles}
                pane1Style={{ overflow: 'auto' }}
                pane2Style={{ overflow: 'auto' }}
            >
                <CodeEditor
                    language={language}
                    defaultValue="// Start coding here"
                    documentId={documentId}
                    disableAutocomplete={true}
                    onLanguageChange={handleLanguageChange}
                />
                <div className="bg-gray-100 h-full p-4">
                    <h3>Output</h3>
                </div>
            </SplitPane>
        </div>
    );
};

export default Canvas;
import React, { useState, useMemo } from 'react';
import { Upload, FileText, Check, AlertTriangle, ChevronDown, ChevronRight, Search, Loader } from 'lucide-react';
import { ScrapedCourse, parseTecHtml } from '../services/scrapingService';
import { Course } from '../types';
import { generateId } from '../utils';

interface ImportHtmlModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (courses: Course[]) => void;
    existingCourses?: Course[];
}

const ImportHtmlModal: React.FC<ImportHtmlModalProps> = ({ isOpen, onClose, onImport, existingCourses = [] }) => {
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [scrapedData, setScrapedData] = useState<ScrapedCourse[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

    const [htmlInput, setHtmlInput] = useState('');
    const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError(null);

        try {
            const text = await file.text();
            processHtml(text);
        } catch (err) {
            console.error(err);
            setError('Error al leer el archivo. Inténtalo de nuevo.');
            setLoading(false);
        }
    };

    const handlePasteProcess = () => {
        if (!htmlInput.trim()) {
            setError('Por favor pega el código HTML primero.');
            return;
        }
        setLoading(true);
        setError(null);
        // Small delay to allow UI to update
        setTimeout(() => {
            processHtml(htmlInput);
        }, 100);
    };

    const processHtml = (html: string) => {
        try {
            const courses = parseTecHtml(html);
            if (courses.length === 0) {
                setError('No se encontraron cursos en el código. Asegúrate de estar copiando el código fuente de la página de matrícula del TEC.');
            } else {
                setScrapedData(courses);
                setStep('preview');
            }
        } catch (err) {
             console.error(err);
             setError('Error al procesar el HTML.');
        } finally {
            setLoading(false);
        }
    };

    // Group courses by Code + Name
    const groupedCourses = useMemo(() => {
        const groups: Record<string, { code: string, name: string, indices: number[] }> = {};

        scrapedData.forEach((course, index) => {
            const key = `${course.originalCode}-${course.name}`;
            if (!groups[key]) {
                groups[key] = {
                    code: course.originalCode,
                    name: course.name,
                    indices: []
                };
            }

            // Filter by search term
            const searchLower = searchTerm.toLowerCase();
            const match =
                course.name.toLowerCase().includes(searchLower) ||
                course.originalCode.toLowerCase().includes(searchLower) ||
                course.professor.toLowerCase().includes(searchLower);

            if (match) {
                groups[key].indices.push(index);
            }
        });

        return Object.entries(groups).filter(([_, group]) => group.indices.length > 0);
    }, [scrapedData, searchTerm]);

    const toggleGroup = (key: string) => {
        const newExpanded = new Set(expandedCourses);
        if (newExpanded.has(key)) {
            newExpanded.delete(key);
        } else {
            newExpanded.add(key);
        }
        setExpandedCourses(newExpanded);
    };

    const toggleSelection = (index: number) => {
        const newSelected = new Set(selectedIndices);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedIndices(newSelected);
    };

    const toggleGroupSelection = (indices: number[]) => {
        const allSelected = indices.every(i => selectedIndices.has(i));
        const newSelected = new Set(selectedIndices);

        if (allSelected) {
            indices.forEach(i => newSelected.delete(i));
        } else {
            indices.forEach(i => newSelected.add(i));
        }
        setSelectedIndices(newSelected);
    };

    const handleImport = () => {
        const coursesToImport: Course[] = Array.from(selectedIndices).map(index => {
            const scraped = scrapedData[index];
            return {
                ...scraped,
                id: generateId(),
                isScheduled: false,
                sessions: scraped.sessions.map(s => ({ ...s, id: generateId() }))
            };
        });

        onImport(coursesToImport);
        handleClose();
    };

    const handleClose = () => {
        setStep('upload');
        setScrapedData([]);
        setSelectedIndices(new Set());
        setSearchTerm('');
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col transition-colors duration-200">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        Importar desde HTML (TEC)
                    </h3>
                    <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <span className="text-2xl">&times;</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden p-6">
                    {step === 'upload' ? (
                        <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 transition-colors p-6">
                            {loading ? (
                                <div className="text-center">
                                    <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                                    <p className="text-gray-600 dark:text-gray-300">Procesando...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex gap-4 mb-6 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <button
                                            onClick={() => setInputMode('file')}
                                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${inputMode === 'file' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                        >
                                            Subir Archivo
                                        </button>
                                        <button
                                            onClick={() => setInputMode('paste')}
                                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${inputMode === 'paste' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                        >
                                            Pegar Código
                                        </button>
                                    </div>

                                    {inputMode === 'file' ? (
                                        <div className="text-center">
                                            <Upload className="w-16 h-16 text-gray-400 mb-4 mx-auto" />
                                            <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
                                                Arrastra tu archivo <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">.html</code> aquí
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                                                Ve a la página de matrícula del TEC (<code>https://tec-appsext.itcr.ac.cr/...</code>), guarda la página (Ctrl+S) y súbela aquí.
                                            </p>
                                            <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md cursor-pointer transition-colors inline-block">
                                                Seleccionar Archivo
                                                <input
                                                    type="file"
                                                    accept=".html,.htm"
                                                    className="hidden"
                                                    onChange={handleFileUpload}
                                                />
                                            </label>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex flex-col max-w-2xl">
                                            <textarea
                                                value={htmlInput}
                                                onChange={e => setHtmlInput(e.target.value)}
                                                placeholder="Pega aquí el código fuente (Ctrl+U, Ctrl+A, Ctrl+C en la página del TEC)..."
                                                className="flex-1 w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm font-mono focus:ring-2 focus:ring-blue-500 mb-4 resize-none dark:text-white"
                                            />
                                            <button
                                                onClick={handlePasteProcess}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors self-end"
                                            >
                                                Procesar Código
                                            </button>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="mt-6 flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded w-full max-w-md justify-center">
                                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                            <span className="text-sm">{error}</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col">
                            <div className="flex justify-between items-center mb-4 gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Filtrar por nombre, código o profesor..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                    {selectedIndices.size} seleccionados de {scrapedData.length} grupos
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                                {groupedCourses.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        No se encontraron resultados para tu búsqueda.
                                    </div>
                                ) : (
                                    groupedCourses.map(([key, group]) => {
                                        const isExpanded = expandedCourses.has(key);
                                        const groupSelectedCount = group.indices.filter(i => selectedIndices.has(i)).length;
                                        const isAllSelected = groupSelectedCount === group.indices.length && group.indices.length > 0;
                                        const isPartialSelected = groupSelectedCount > 0 && !isAllSelected;

                                        return (
                                            <div key={key} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                                                <div
                                                    className={`flex items-center p-3 bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors ${isExpanded ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
                                                    onClick={() => toggleGroup(key)}
                                                >
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleGroupSelection(group.indices); }}
                                                        className={`w-5 h-5 rounded border mr-3 flex items-center justify-center transition-colors ${
                                                            isAllSelected ? 'bg-blue-600 border-blue-600 text-white' :
                                                            isPartialSelected ? 'bg-blue-100 border-blue-400 text-blue-600 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300' :
                                                            'border-gray-300 dark:border-gray-500 hover:border-blue-500'
                                                        }`}
                                                    >
                                                        {isAllSelected && <Check className="w-3 h-3" />}
                                                        {isPartialSelected && <div className="w-2 h-2 bg-current rounded-full" />}
                                                    </button>

                                                    <div className="flex-1">
                                                        <h4 className="font-medium text-gray-800 dark:text-gray-200">
                                                            {group.code} - {group.name}
                                                        </h4>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {group.indices.length} grupos disponibles
                                                        </span>
                                                    </div>

                                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                                </div>

                                                {isExpanded && (
                                                    <div className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                                                        {group.indices.map(index => {
                                                            const course = scrapedData[index];
                                                            const isSelected = selectedIndices.has(index);

                                                            // Check if duplicate (same code and group)
                                                            const isDuplicate = existingCourses.some(
                                                                c => (c.name === course.name || (c as any).originalCode === course.originalCode) && c.group === course.group
                                                            );
                                                            // Note: Course interface doesn't have originalCode usually, but we match by name/group or try to infer.
                                                            // Best effort: match by Name + Group.

                                                            return (
                                                                <div
                                                                    key={index}
                                                                    className={`flex items-start p-3 pl-12 transition-colors cursor-pointer ${
                                                                        isDuplicate ? 'bg-yellow-50 dark:bg-yellow-900/10 opacity-75' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                                                    }`}
                                                                    onClick={() => !isDuplicate && toggleSelection(index)}
                                                                >
                                                                    <div className={`mt-1 w-4 h-4 rounded border flex items-center justify-center mr-3 transition-colors flex-shrink-0 ${
                                                                        isSelected ? 'bg-blue-600 border-blue-600 text-white' :
                                                                        isDuplicate ? 'border-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 dark:border-yellow-700 cursor-not-allowed' :
                                                                        'border-gray-300 dark:border-gray-600'
                                                                    }`}>
                                                                        {isSelected && <Check className="w-3 h-3" />}
                                                                        {isDuplicate && <div className="w-2 h-2 bg-yellow-500 rounded-full" />}
                                                                    </div>
                                                                    <div className="flex-1 text-sm">
                                                                        <div className="flex justify-between mb-1">
                                                                            <span className="font-medium text-gray-700 dark:text-gray-300">
                                                                                Grupo {course.group}
                                                                                {isDuplicate && <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-500">(Ya importado)</span>}
                                                                            </span>
                                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                                                course.status === 'Presencial' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                                                                course.status === 'Virtual' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                                                                'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                                                            }`}>
                                                                                {course.status}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-gray-600 dark:text-gray-400 mb-1">
                                                                            {course.professor || 'Profesor no asignado'}
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            {course.sessions.map((s, si) => (
                                                                                <div key={si} className="text-xs text-gray-500 dark:text-gray-500 flex gap-2">
                                                                                    <span className="font-mono w-16">{s.day}</span>
                                                                                    <span>{s.startTime} - {s.endTime}</span>
                                                                                    <span className="italic">({s.classroom})</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                    >
                        Cancelar
                    </button>
                    {step === 'preview' && (
                        <button
                            onClick={handleImport}
                            disabled={selectedIndices.size === 0}
                            className={`px-6 py-2 rounded-md transition-colors flex items-center gap-2 ${
                                selectedIndices.size === 0
                                ? 'bg-blue-300 dark:bg-blue-800 text-white cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                            }`}
                        >
                            <Check className="w-4 h-4" />
                            Importar {selectedIndices.size} Cursos
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportHtmlModal;

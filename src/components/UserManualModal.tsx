import React from 'react';
import { X, BookOpen, CheckCircle, AlertCircle, HelpCircle, FileText, Download, Calendar } from 'lucide-react';
import Scrollable from './Scrollable';

interface UserManualModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const UserManualModal: React.FC<UserManualModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[85vh] flex flex-col transition-colors duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-blue-500" />
                        Manual de Uso
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <Scrollable className="flex-1 p-6 space-y-8 text-gray-700 dark:text-gray-300">

                    {/* 1. Introducción */}
                    <section>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                            Introducción
                        </h4>
                        <p>
                            Bienvenido al <strong>Creador de Horarios Universitarios</strong>. Esta herramienta está diseñada para ayudarte a planificar tu matrícula académica de manera eficiente, visualizando posibles combinaciones de cursos y detectando choques de horario automáticamente.
                        </p>
                    </section>

                    {/* 2. Flujo de Trabajo (Pasos) */}
                    <section>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                            Pasos para crear tu horario
                        </h4>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                                <div className="font-semibold mb-2 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                    <Download className="w-4 h-4" /> Paso 1: Obtener Cursos
                                </div>
                                <p className="text-sm">
                                    Ve a la página de matrícula del TEC. Usa nuestra <strong>extensión de Chrome</strong> para copiar los datos o guarda la página como HTML (Ctrl+S).
                                </p>
                            </div>

                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                                <div className="font-semibold mb-2 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                    <FileText className="w-4 h-4" /> Paso 2: Importar
                                </div>
                                <p className="text-sm">
                                    Haz clic en el botón de importar <FileText className="w-3 h-3 inline"/> en esta página. Pega el código o sube el archivo para cargar tus cursos disponibles.
                                </p>
                            </div>

                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                                <div className="font-semibold mb-2 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                    <CheckCircle className="w-4 h-4" /> Paso 3: Seleccionar
                                </div>
                                <p className="text-sm">
                                    En la tabla de cursos, usa el botón <strong>+</strong> para agregar cursos a tu horario tentativo. El sistema te avisará si hay choques.
                                </p>
                            </div>

                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                                <div className="font-semibold mb-2 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                    <Calendar className="w-4 h-4" /> Paso 4: Visualizar
                                </div>
                                <p className="text-sm">
                                    Revisa el horario gráfico semanal. Puedes crear múltiples horarios (Escenario A, Escenario B) usando el gestor de horarios.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* 3. Funciones Principales */}
                    <section>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                            Funciones Principales
                        </h4>
                        <ul className="list-disc pl-10 space-y-2 text-sm">
                            <li><strong>Gestión de Múltiples Horarios:</strong> Crea varios escenarios (ej. "Plan Ideal", "Plan B") sin perder tu progreso.</li>
                            <li><strong>Detección de Choques:</strong> Alerta inmediata si intentas agregar un curso que se solapa con otro.</li>
                            <li><strong>Importación Inteligente:</strong> Reconoce automáticamente grupos, profesores y horarios desde el sistema del TEC.</li>
                            <li><strong>Modo Oscuro:</strong> Interfaz adaptada para trabajar cómodamente de noche.</li>
                        </ul>
                    </section>

                    {/* 4. Mejores Prácticas */}
                    <section>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
                            Recomendaciones
                        </h4>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                    <span>Usa la extensión de Chrome "Exportador de cursos" para mayor rapidez y seguridad.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                    <span>Crea un horario base con tus cursos obligatorios y luego duplícalo para probar electivas.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                    <span>Verifica siempre el cupo real en la página del TEC antes de la matrícula final.</span>
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* 5. Preguntas Frecuentes */}
                    <section>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 w-6 h-6 rounded-full flex items-center justify-center text-sm">5</span>
                            Preguntas Frecuentes (FAQ)
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <h5 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    <HelpCircle className="w-4 h-4" /> ¿Se guardan mis datos?
                                </h5>
                                <p className="text-sm pl-6">Sí, todo se guarda localmente en tu navegador. Si cierras la pestaña y vuelves, tus horarios seguirán aquí. No enviamos información a ningún servidor.</p>
                            </div>
                            <div>
                                <h5 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" /> ¿Por qué no carga el archivo HTML?
                                </h5>
                                <p className="text-sm pl-6">Asegúrate de haber guardado la página completa o solo HTML desde el navegador. Si usas copiar/pegar, asegúrate de copiar TODO el código fuente (Ctrl+A).</p>
                            </div>
                        </div>
                    </section>

                </Scrollable>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors shadow-sm"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserManualModal;

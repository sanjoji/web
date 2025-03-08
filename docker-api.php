<?php
/**
 * Docker API - Interfaz para ejecutar comandos Docker
 * 
 * Este script permite ejecutar comandos Docker específicos a través de una API REST.
 * Incluye validación de comandos, manejo de errores y respuestas JSON.
 */

// Configuración inicial
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Establecer límite de tiempo de ejecución
set_time_limit(30);

// Configurar cabeceras CORS y tipo de contenido
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

// Manejar solicitudes preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Función para registrar errores
function logError($message, $level = 'ERROR') {
    $logFile = __DIR__ . '/docker-api-errors.log';
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] [$level] $message" . PHP_EOL;
    error_log($logMessage, 3, $logFile);
}

// Función para responder con JSON
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// Definición de comandos permitidos con sus respectivos comandos reales
const ALLOWED_COMMANDS = [
    'ps' => "sudo docker ps",
    'images' => "sudo docker images",
    'restart' => "sudo docker restart"
];

try {
    // Verificar método de solicitud
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception("Método no permitido. Use POST para enviar comandos.");
    }
    
    // Obtener datos de entrada
    $input = file_get_contents('php://input');
    if (empty($input)) {
        throw new Exception("No se recibieron datos de entrada");
    }
    
    // Decodificar JSON
    $data = json_decode($input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Error al decodificar JSON: " . json_last_error_msg());
    }
    
    // Validar presencia del comando
    if (!isset($data['command']) || empty(trim($data['command']))) {
        throw new Exception("No se especificó ningún comando");
    }
    
    $command = trim($data['command']);
    
    // Extraer la acción principal del comando (primer palabra)
    $commandParts = explode(' ', $command, 2);
    $action = $commandParts[0];
    
    // Verificar si el comando está permitido
    if (!array_key_exists($action, ALLOWED_COMMANDS)) {
        throw new Exception("Comando no permitido: " . $action);
    }
    
    // Preparar el comando completo
    $fullCommand = ALLOWED_COMMANDS[$action];
    
    // Manejar comandos que requieren argumentos adicionales
    if ($action === 'restart' && isset($commandParts[1])) {
        $containerId = trim($commandParts[1]);
        
        // Validación estricta del ID del contenedor
        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $containerId)) {
            throw new Exception("ID de contenedor no válido. Solo se permiten letras, números, guiones y guiones bajos.");
        }
        
        $fullCommand .= " " . escapeshellarg($containerId);
    }
    
    // Configurar y ejecutar el proceso
    $descriptorspec = [
        0 => ["pipe", "r"],  // stdin
        1 => ["pipe", "w"],  // stdout
        2 => ["pipe", "w"],  // stderr
    ];
    
    // Registrar el comando que se va a ejecutar (para debug)
    logError("Ejecutando comando: $fullCommand", 'INFO');
    
    // Ejecutar el comando con mejor control
    $process = proc_open($fullCommand, $descriptorspec, $pipes, null, null, ['bypass_shell' => true]);
    
    if (!is_resource($process)) {
        throw new Exception("No se pudo iniciar el proceso para ejecutar el comando");
    }
    
    // Cerrar stdin ya que no lo necesitamos
    fclose($pipes[0]);
    
    // Establecer timeout para la lectura de salida
    stream_set_timeout($pipes[1], 20);
    stream_set_timeout($pipes[2], 20);
    
    // Leer stdout y stderr
    $output = stream_get_contents($pipes[1]);
    $error = stream_get_contents($pipes[2]);
    
    // Cerrar los pipes
    fclose($pipes[1]);
    fclose($pipes[2]);
    
    // Cerrar el proceso y obtener el código de salida
    $returnCode = proc_close($process);
    
    // Responder basado en el resultado
    if ($returnCode === 0) {
        jsonResponse([
            'success' => true,
            'command' => $action,
            'output' => trim($output)
        ]);
    } else {
        // Registrar el error pero dar una respuesta más amigable
        logError("Comando falló ($returnCode): $error");
        jsonResponse([
            'success' => false,
            'command' => $action,
            'error' => 'Error al ejecutar el comando',
            'details' => trim($error)
        ], 500);
    }
    
} catch (Exception $e) {
    // Registrar excepción y enviar respuesta de error
    $errorMessage = $e->getMessage();
    logError($errorMessage);
    jsonResponse([
        'success' => false,
        'error' => $errorMessage
    ], 400);
}
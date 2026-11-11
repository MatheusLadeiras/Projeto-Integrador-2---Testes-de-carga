@echo off
cd /d "%~dp0"
set MEDICAO=%1
if "%MEDICAO%"=="" set MEDICAO=1
set PASTA=resultados\medicao-%MEDICAO%
if not exist %PASTA%\bruto mkdir %PASTA%\bruto

call :servico criarAnuncio
call :servico fazerPedido

echo.
echo ===== Graficos e README =====
python graficos.py %MEDICAO%
echo.
echo Pronto. Abra o README.md desta pasta para ver as medicoes.
pause
exit /b

:servico
echo.
echo ===== Medicao %MEDICAO%, servico: %1 =====
set SCRIPT=%1.js
if exist k6\%1.js set SCRIPT=k6\%1.js
if exist testes\%1.js set SCRIPT=testes\%1.js
k6 run --out csv=%PASTA%\bruto\%1.csv --summary-export %PASTA%\%1.json %SCRIPT%
exit /b

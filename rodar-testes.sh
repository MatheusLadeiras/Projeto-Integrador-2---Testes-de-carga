set -u

cd "$(dirname "$0")" || exit 1

MEDICAO="${1:-1}"
PASTA="resultados/medicao-${MEDICAO}"
mkdir -p "${PASTA}/bruto"

rodar_servico() {
  local servico="$1"
  local script="${servico}.js"

  if [ -f "k6/${servico}.js" ]; then
    script="k6/${servico}.js"
  elif [ -f "testes/${servico}.js" ]; then
    script="testes/${servico}.js"
  fi

  echo ""
  echo "===== Medicao ${MEDICAO}, servico: ${servico} ====="
  k6 run \
    --out "csv=${PASTA}/bruto/${servico}.csv" \
    --summary-export "${PASTA}/${servico}.json" \
    "${script}"
}

rodar_servico "criarAnuncio"
rodar_servico "fazerPedido"

echo ""
echo "===== Graficos e README ====="
if command -v python3 >/dev/null 2>&1; then
  python3 graficos.py "${MEDICAO}"
else
  python graficos.py "${MEDICAO}"
fi

echo ""
echo "Pronto. Abra o README.md desta pasta para ver as medicoes."

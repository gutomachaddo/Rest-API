// ─── HOC 1: withValidation ───────────────────────────────────────────────────
// Envolve um handler e valida os campos obrigatórios antes de prosseguir
const withValidation = (requiredFields, handler) => (req, res) => {
  const body = req.body || {};
  const missing = requiredFields.filter((field) => body[field] === undefined);

  if (missing.length > 0) {
    return res.status(400).json({
      error: "Campos obrigatórios ausentes",
      missing,
    });
  }

  return handler(req, res);
};

// ─── HOC 2: withErrorHandler ─────────────────────────────────────────────────
// Envolve um handler async e captura erros automaticamente
const withErrorHandler = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    console.error("[ERROR]", err.message);
    res.status(500).json({ error: "Erro interno no servidor", detail: err.message });
  }
};

// ─── Função Recursiva: flattenClicks ─────────────────────────────────────────
// Achata grupos de clicks aninhados em uma lista plana recursivamente
const flattenClicks = (items, depth = 0) => {
  if (!items || items.length === 0) return [];

  const [head, ...tail] = items;

  if (Array.isArray(head)) {
    return [...flattenClicks(head, depth + 1), ...flattenClicks(tail, depth)];
  }

  return [head, ...flattenClicks(tail, depth)];
};

// Função Recursiva: groupClicksByRegion
// Agrupa clicks por regiões da tela recursivamente (divide em quadrantes)
const groupClicksByRegion = (clicks, bounds, depth = 0) => {
  if (clicks.length === 0 || depth >= 3) {
    return { clicks, bounds, depth, count: clicks.length };
  }

  const midX = (bounds.minX + bounds.maxX) / 2;
  const midY = (bounds.minY + bounds.maxY) / 2;

  const quadrants = {
    topLeft: clicks.filter((c) => c.x <= midX && c.y <= midY),
    topRight: clicks.filter((c) => c.x > midX && c.y <= midY),
    bottomLeft: clicks.filter((c) => c.x <= midX && c.y > midY),
    bottomRight: clicks.filter((c) => c.x > midX && c.y > midY),
  };

  return {
    bounds,
    depth,
    count: clicks.length,
    children: {
      topLeft: groupClicksByRegion(quadrants.topLeft, { minX: bounds.minX, maxX: midX, minY: bounds.minY, maxY: midY }, depth + 1),
      topRight: groupClicksByRegion(quadrants.topRight, { minX: midX, maxX: bounds.maxX, minY: bounds.minY, maxY: midY }, depth + 1),
      bottomLeft: groupClicksByRegion(quadrants.bottomLeft, { minX: bounds.minX, maxX: midX, minY: midY, maxY: bounds.maxY }, depth + 1),
      bottomRight: groupClicksByRegion(quadrants.bottomRight, { minX: midX, maxX: bounds.maxX, minY: midY, maxY: bounds.maxY }, depth + 1),
    },
  };
};

// Função Recursiva: sumIntensity
// Soma as intensidades de uma lista de clicks recursivamente
const sumIntensity = (clicks) => {
  if (clicks.length === 0) return 0;
  const [head, ...tail] = clicks;
  return head.intensity + sumIntensity(tail);
};

module.exports = {
  withValidation,
  withErrorHandler,
  flattenClicks,
  groupClicksByRegion,
  sumIntensity,
};

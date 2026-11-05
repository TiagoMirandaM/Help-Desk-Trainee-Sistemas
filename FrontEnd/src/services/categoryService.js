import { DEMO_MODE } from '../utils/env.js';
import { api } from './api.js';
import { normalizeCategory, normalizeListResponse } from './normalizers.js';
import * as demo from './demo/demoBackend.js';

export async function listCategories() {
  if (DEMO_MODE) {
    const data = await demo.listCategories();
    const list = normalizeListResponse(data);
    return list.results.map(normalizeCategory);
  }

  const { data } = await api.get('/categories/');
  return normalizeListResponse(data).results.map(normalizeCategory);
}

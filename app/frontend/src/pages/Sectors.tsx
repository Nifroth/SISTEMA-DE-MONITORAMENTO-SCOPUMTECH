import { useEffect, useState } from 'react';
import {
  fetchSectors,
  createSector,
  updateSector,
  deleteSector,
  type Sector,
} from '@/lib/api';
import { Building2, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

export default function SectorsPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    camera_id: '',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    loadSectors();
  }, []);

  async function loadSectors() {
    setLoading(true);
    try {
      const data = await fetchSectors();
      setSectors(data);
    } catch (err) {
      console.error('Error loading sectors:', err);
    } finally {
      setLoading(false);
    }
  }

  function openAddForm() {
    setEditingSector(null);
    setForm({ name: '', description: '', location: '', camera_id: '', status: 'active' });
    setShowForm(true);
  }

  function openEditForm(sector: Sector) {
    setEditingSector(sector);
    setForm({
      name: sector.name,
      description: sector.description,
      location: sector.location,
      camera_id: sector.camera_id,
      status: sector.status,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingSector) {
        await updateSector(editingSector.id, form);
      } else {
        await createSector(form);
      }
      setShowForm(false);
      await loadSectors();
    } catch (err) {
      console.error('Error saving sector:', err);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja excluir este setor?')) return;
    try {
      await deleteSector(id);
      await loadSectors();
    } catch (err) {
      console.error('Error deleting sector:', err);
    }
  }

  async function toggleStatus(sector: Sector) {
    const newStatus = sector.status === 'active' ? 'inactive' : 'active';
    try {
      await updateSector(sector.id, { status: newStatus });
      await loadSectors();
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Setores</h1>
            <p className="text-sm text-slate-400">Gerenciamento de setores monitorados</p>
          </div>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Setor
        </button>
      </div>

      {/* Form Dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">
              {editingSector ? 'Editar Setor' : 'Novo Setor'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nome</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Descrição</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Localização</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">ID da Câmera</label>
                <input
                  type="text"
                  value={form.camera_id}
                  onChange={(e) => setForm({ ...form, camera_id: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {editingSector ? 'Salvar' : 'Criar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#1E293B] border border-slate-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Carregando setores...</div>
        ) : sectors.length === 0 ? (
          <div className="p-8 text-center text-slate-400">Nenhum setor cadastrado</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-[#0F172A]/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Descrição</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Localização</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Câmera</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sectors.map((sector) => (
                <tr key={sector.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="px-4 py-3 text-sm text-white font-medium">{sector.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{sector.description}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{sector.location}</td>
                  <td className="px-4 py-3 text-sm text-slate-300 font-mono">{sector.camera_id}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        sector.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {sector.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleStatus(sector)}
                        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        title="Alternar status"
                      >
                        {sector.status === 'active' ? (
                          <ToggleRight className="w-4 h-4 text-green-400" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-red-400" />
                        )}
                      </button>
                      <button
                        onClick={() => openEditForm(sector)}
                        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sector.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
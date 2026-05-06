import { useEffect, useState } from 'react';
import {
  fetchGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  fetchSectors,
  fetchSectorGroupAssignments,
  createSectorGroupAssignment,
  deleteSectorGroupAssignment,
  type EnvironmentGroup,
  type Sector,
  type SectorGroupAssignment,
} from '@/lib/api';
import { Layers, Plus, Pencil, Trash2, X } from 'lucide-react';

export default function GroupsPage() {
  const [groups, setGroups] = useState<EnvironmentGroup[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [assignments, setAssignments] = useState<SectorGroupAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<EnvironmentGroup | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', description: '', color: '#3B82F6' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [g, s, a] = await Promise.all([
        fetchGroups(),
        fetchSectors(),
        fetchSectorGroupAssignments(),
      ]);
      setGroups(g);
      setSectors(s);
      setAssignments(a);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }

  function getGroupSectors(groupId: number): Sector[] {
    const sectorIds = assignments
      .filter((a) => a.group_id === groupId)
      .map((a) => a.sector_id);
    return sectors.filter((s) => sectorIds.includes(s.id));
  }

  function getUnassignedSectors(groupId: number): Sector[] {
    const assignedIds = assignments
      .filter((a) => a.group_id === groupId)
      .map((a) => a.sector_id);
    return sectors.filter((s) => !assignedIds.includes(s.id));
  }

  function openAddForm() {
    setEditingGroup(null);
    setForm({ name: '', description: '', color: '#3B82F6' });
    setShowForm(true);
  }

  function openEditForm(group: EnvironmentGroup) {
    setEditingGroup(group);
    setForm({ name: group.name, description: group.description, color: group.color });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingGroup) {
        await updateGroup(editingGroup.id, form);
      } else {
        await createGroup(form);
      }
      setShowForm(false);
      await loadData();
    } catch (err) {
      console.error('Error saving group:', err);
    }
  }

  async function handleDeleteGroup(id: number) {
    if (!confirm('Tem certeza que deseja excluir este grupo?')) return;
    try {
      await deleteGroup(id);
      await loadData();
    } catch (err) {
      console.error('Error deleting group:', err);
    }
  }

  async function handleAssignSector(groupId: number, sectorId: number) {
    try {
      await createSectorGroupAssignment({ sector_id: sectorId, group_id: groupId });
      await loadData();
    } catch (err) {
      console.error('Error assigning sector:', err);
    }
  }

  async function handleUnassignSector(groupId: number, sectorId: number) {
    const assignment = assignments.find(
      (a) => a.group_id === groupId && a.sector_id === sectorId
    );
    if (!assignment) return;
    try {
      await deleteSectorGroupAssignment(assignment.id);
      await loadData();
    } catch (err) {
      console.error('Error unassigning sector:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Carregando grupos...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-7 h-7 text-purple-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Grupos de Ambiente</h1>
            <p className="text-sm text-slate-400">Organize setores em grupos lógicos</p>
          </div>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Grupo
        </button>
      </div>

      {/* Form Dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">
              {editingGroup ? 'Editar Grupo' : 'Novo Grupo'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nome</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Descrição</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Cor</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-10 h-10 rounded border border-slate-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="flex-1 px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  {editingGroup ? 'Salvar' : 'Criar'}
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

      {/* Assign Sector Dialog */}
      {showAssignDialog !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Atribuir Setor</h2>
              <button
                onClick={() => setShowAssignDialog(null)}
                className="p-1 rounded hover:bg-slate-700 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {getUnassignedSectors(showAssignDialog).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  Todos os setores já estão atribuídos a este grupo
                </p>
              ) : (
                getUnassignedSectors(showAssignDialog).map((sector) => (
                  <button
                    key={sector.id}
                    onClick={() => handleAssignSector(showAssignDialog, sector.id)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-[#0F172A] border border-slate-600 rounded-lg text-white hover:border-purple-500 transition-colors"
                  >
                    <span className="text-sm">{sector.name}</span>
                    <span className="text-xs text-slate-400">{sector.location}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-8 text-center text-slate-400">
          Nenhum grupo cadastrado
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => {
            const groupSectors = getGroupSectors(group.id);
            return (
              <div
                key={group.id}
                className="bg-[#1E293B] border border-slate-700 rounded-xl p-5 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <div>
                      <h3 className="text-white font-semibold">{group.name}</h3>
                      <p className="text-xs text-slate-400">{group.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditForm(group)}
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Assigned Sectors */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 uppercase font-medium">
                      Setores ({groupSectors.length})
                    </span>
                    <button
                      onClick={() => setShowAssignDialog(group.id)}
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      + Atribuir
                    </button>
                  </div>
                  {groupSectors.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Nenhum setor atribuído</p>
                  ) : (
                    <div className="space-y-1">
                      {groupSectors.map((sector) => (
                        <div
                          key={sector.id}
                          className="flex items-center justify-between px-2 py-1.5 bg-[#0F172A] rounded-lg"
                        >
                          <span className="text-xs text-slate-300">{sector.name}</span>
                          <button
                            onClick={() => handleUnassignSector(group.id, sector.id)}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
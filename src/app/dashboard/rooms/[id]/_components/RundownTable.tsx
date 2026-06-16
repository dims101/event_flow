'use client';

import React, { useTransition, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { deleteRundownItemAction, reorderRundownItemsAction, editRundownItemAction } from '@/app/actions/rundown';
import { updateRoomStartTimeAction } from '@/app/actions/room';
import { Trash2, Clock, ClipboardList, GripVertical, Pencil, X, Check } from 'lucide-react';
import { getRoleBadgeStyle } from '@/lib/picColors';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface RundownItem {
  id: string;
  roomId: string;
  title: string;
  durationSeconds: number;
  targetRole: string;
  targetPics?: string | null;
  orderIndex: number;
}

interface Pic {
  id: string;
  name: string;
}

interface RundownTableProps {
  items: RundownItem[];
  pics: Pic[];
  room: { id: string; rundownStartTime: string };
}

const renderPicBadges = (item: RundownItem) => {
  let list: string[] = [];
  if (item.targetPics) {
    try {
      list = JSON.parse(item.targetPics);
    } catch (e) {
      list = item.targetRole ? item.targetRole.split(', ') : ['All'];
    }
  } else {
    list = item.targetRole ? item.targetRole.split(', ') : ['All'];
  }

  return (
    <div className="flex flex-wrap gap-1">
      {list.map((pic) => (
        <span
          key={pic}
          className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold ${getRoleBadgeStyle(pic)}`}
        >
          {pic}
        </span>
      ))}
    </div>
  );
};

export default function RundownTable({ items, pics, room }: RundownTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localItems, setLocalItems] = useState(items);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isEditingStartTime, setIsEditingStartTime] = useState(false);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Hapus sesi "${title}" dari rundown?`)) return;

    startTransition(async () => {
      const res = await deleteRundownItemAction(id);
      if (res?.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await editRundownItemAction(id, formData);
      if (res?.error) {
        alert(res.error);
      } else {
        setEditingItemId(null);
        router.refresh();
      }
    });
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    const reordered = Array.from(localItems);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    setLocalItems(reordered);

    startTransition(async () => {
      const roomId = items[0]?.roomId;
      if (!roomId) return;

      const orderedIds = reordered.map((item) => item.id);
      const res = await reorderRundownItemsAction(roomId, orderedIds);
      if (res?.error) {
        alert(res.error);
        setLocalItems(items); // Rollback
      } else {
        router.refresh();
      }
    });
  };



  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl p-12 text-center bg-slate-900/5 animate-in fade-in duration-200">
        <div className="mx-auto w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
          <ClipboardList className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-300 font-sans">Rundown masih kosong</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
          Belum ada jadwal kegiatan yang ditambahkan. Gunakan formulir di sebelah kanan untuk menambahkan sesi acara pertama Anda.
        </p>
      </div>
    );
  }

  // Calculate cumulative times
  let accumulatedMinutes = 0;

  const formatSessionTime = (startTimeStr: string, offsetMinutes: number, durationMinutes: number) => {
    // Parse "HH:MM"
    const [hStr, mStr] = startTimeStr.split(':');
    let baseHour = parseInt(hStr, 10) || 0;
    let baseMinute = parseInt(mStr, 10) || 0;

    // Start time
    const totalStartMins = baseHour * 60 + baseMinute + offsetMinutes;
    const startH = Math.floor(totalStartMins / 60) % 24;
    const startM = totalStartMins % 60;

    // End time
    const totalEndMins = totalStartMins + durationMinutes;
    const endH = Math.floor(totalEndMins / 60) % 24;
    const endM = totalEndMins % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(startH)}:${pad(startM)} - ${pad(endH)}:${pad(endM)}`;
  };

  const handleStartTimeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newTime = formData.get('startTime') as string;
    
    startTransition(async () => {
      const res = await updateRoomStartTimeAction(room.id, newTime);
      if (res?.error) alert(res.error);
      else {
        setIsEditingStartTime(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Header section for Rundown Start Time */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Waktu Mulai Rundown</h3>
          {!isEditingStartTime ? (
            <p className="text-lg font-bold text-slate-100 font-mono mt-0.5">{room.rundownStartTime}</p>
          ) : (
            <form onSubmit={handleStartTimeSubmit} className="flex items-center gap-2 mt-1.5">
              <input 
                type="time" 
                name="startTime" 
                defaultValue={room.rundownStartTime}
                required
                className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-sm focus:outline-none focus:border-indigo-500"
              />
              <button 
                type="submit" 
                disabled={isPending}
                className="p-1.5 bg-green-600/20 text-green-400 rounded hover:bg-green-600/30 transition disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
              </button>
              <button 
                type="button" 
                onClick={() => setIsEditingStartTime(false)}
                className="p-1.5 bg-slate-800 text-slate-400 rounded hover:bg-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
        {!isEditingStartTime && (
          <button 
            onClick={() => setIsEditingStartTime(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        )}
      </div>

    <DragDropContext onDragEnd={onDragEnd}>
      <div className="space-y-4" suppressHydrationWarning>
        {/* MOBILE LIST VIEW (hidden on desktop) */}
        <Droppable droppableId="rundown-mobile">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex sm:hidden flex-col gap-3"
            >
              {(() => {
                let mobileAccumulated = 0;
                return localItems.map((item, index) => {
                  const durationMinutes = item.durationSeconds / 60;
                  const startOffset = mobileAccumulated;
                  mobileAccumulated += durationMinutes;

                  return (
                    <Draggable key={`mobile-${item.id}`} draggableId={`mobile-${item.id}`} index={index} isDragDisabled={editingItemId === item.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`border border-slate-900/40 rounded-xl p-4 flex flex-col gap-3 justify-between transition-colors ${
                            snapshot.isDragging ? 'bg-slate-800 border-indigo-500/40' : 'bg-slate-900'
                          }`}
                          style={provided.draggableProps.style as React.CSSProperties}
                        >
                          {editingItemId === item.id ? (
                            <form onSubmit={(e) => handleEditSubmit(e, item.id)} className="space-y-3">
                              <div style={{ display: 'none' }} {...provided.dragHandleProps} />
                              <input
                                type="text"
                                name="title"
                                defaultValue={item.title}
                                required
                                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                              />
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  name="durationMinutes"
                                  defaultValue={durationMinutes}
                                  required
                                  min="1"
                                  className="w-20 px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-sm text-center focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                                <span className="text-xs text-slate-400 font-medium">Menit</span>
                              </div>
                              <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-800/50">
                                {pics.length === 0 ? (
                                  <span className="text-[10px] text-slate-500 italic">Tidak ada PIC</span>
                                ) : (
                                  pics.map((pic) => {
                                    const isChecked = item.targetPics
                                      ? item.targetPics.includes(`"${pic.name}"`)
                                      : item.targetRole?.includes(pic.name);
                                    return (
                                      <label key={pic.id} className={`flex items-center gap-1 px-2 py-1 rounded border cursor-pointer text-[10px] font-bold ${getRoleBadgeStyle(pic.name)}`}>
                                        <input
                                          type="checkbox"
                                          name="targetPics"
                                          value={pic.name}
                                          defaultChecked={isChecked}
                                          className="w-3 h-3 rounded border-transparent bg-slate-950 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                                        />
                                        <span>{pic.name}</span>
                                      </label>
                                    );
                                  })
                                )}
                              </div>
                              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/50">
                                <button
                                  type="button"
                                  onClick={() => setEditingItemId(null)}
                                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg flex items-center gap-1 transition"
                                >
                                  <X className="w-3.5 h-3.5" /> Batal
                                </button>
                                <button
                                  type="submit"
                                  disabled={isPending}
                                  className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1 transition disabled:opacity-50"
                                >
                                  {isPending ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  Simpan
                                </button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-2">
                                  {/* Drag Handle */}
                                  <div
                                    {...provided.dragHandleProps}
                                    className="mt-1 p-1 text-slate-500 hover:text-slate-350 cursor-grab active:cursor-grabbing touch-none"
                                    style={{
                                      touchAction: 'none'
                                    }}
                                  >
                                    <GripVertical className="w-4 h-4" />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs text-slate-500 font-bold">#{index + 1}</span>
                                      <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-900/60">
                                        {formatSessionTime(room.rundownStartTime, startOffset, durationMinutes)}
                                      </span>
                                    </div>
                                    <h5 className="font-bold text-slate-200 text-sm leading-snug">{item.title}</h5>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setEditingItemId(item.id)}
                                    disabled={isPending}
                                    className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition duration-150 min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                    title="Edit Sesi"
                                    aria-label={`Edit Sesi ${item.title}`}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item.id, item.title)}
                                    disabled={isPending}
                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition duration-150 min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                                    title="Hapus Sesi"
                                    aria-label={`Hapus Sesi ${item.title}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-900/40 text-xs">
                                {renderPicBadges(item)}
                                <span className="text-slate-400 font-medium flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{durationMinutes} Menit</span>
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                });
              })()}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        {/* DESKTOP TABLE VIEW (hidden on mobile) */}
        <div className="hidden sm:block border border-slate-900/40 bg-slate-900 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-900/40 bg-slate-900/30 text-slate-400 text-[10px] font-bold uppercase tracking-wider select-none">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4 w-[25%]">Sesi / Kegiatan</th>
                  <th className="py-3 px-4 w-[15%] text-center">Durasi</th>
                  <th className="py-3 px-4 w-[30%]">Kru Target</th>
                  <th className="py-3 px-4 w-[20%] text-center">Est. Mulai</th>
                  <th className="py-3 px-4 w-16 text-center">Aksi</th>
                </tr>
              </thead>
              <Droppable droppableId="rundown-desktop">
                {(provided) => (
                  <tbody
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="divide-y divide-slate-900/30 text-sm"
                  >
                    {(() => {
                      let tableStartOffset = 0;
                      return localItems.map((item, index) => {
                        const durationMinutes = item.durationSeconds / 60;
                        const currentOffset = tableStartOffset;
                        tableStartOffset += durationMinutes;

                        return (
                          <Draggable key={`desktop-${item.id}`} draggableId={`desktop-${item.id}`} index={index} isDragDisabled={editingItemId === item.id}>
                            {(provided, snapshot) =>
                              editingItemId === item.id ? (
                              <tr 
                                className="bg-slate-800/80"
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                style={provided.draggableProps.style as React.CSSProperties}
                              >
                                <td colSpan={6} className="p-0">
                                  <div style={{ display: 'none' }} {...provided.dragHandleProps} />
                                  <form onSubmit={(e) => handleEditSubmit(e, item.id)} className="flex items-center gap-4 px-4 py-3">
                                    <div className="flex-1">
                                      <input
                                        type="text"
                                        name="title"
                                        defaultValue={item.title}
                                        required
                                        className="w-full px-3 py-1.5 rounded border border-slate-700 bg-slate-950 text-slate-200 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                      />
                                    </div>
                                    <div className="w-24">
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="number"
                                          name="durationMinutes"
                                          defaultValue={durationMinutes}
                                          required
                                          min="1"
                                          className="w-16 px-2 py-1.5 rounded border border-slate-700 bg-slate-950 text-slate-200 text-sm text-center focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                        <span className="text-xs text-slate-400">mnt</span>
                                      </div>
                                    </div>
                                    <div className="w-56 flex flex-wrap gap-1">
                                      {pics.length === 0 ? (
                                        <span className="text-[10px] text-slate-500 italic">Tidak ada PIC</span>
                                      ) : (
                                        pics.map((pic) => {
                                          const isChecked = item.targetPics
                                            ? item.targetPics.includes(`"${pic.name}"`)
                                            : item.targetRole?.includes(pic.name);
                                          return (
                                            <label key={pic.id} className={`flex items-center gap-1 px-1.5 py-0.5 rounded border cursor-pointer text-[10px] font-bold ${getRoleBadgeStyle(pic.name)}`}>
                                              <input
                                                type="checkbox"
                                                name="targetPics"
                                                value={pic.name}
                                                defaultChecked={isChecked}
                                                className="w-3 h-3 rounded border-transparent bg-slate-950 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                                              />
                                              <span>{pic.name}</span>
                                            </label>
                                          );
                                        })
                                      )}
                                    </div>
                                    <div className="w-24 flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setEditingItemId(null)}
                                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition"
                                        title="Batal"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="submit"
                                        disabled={isPending}
                                        className="p-1.5 text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition disabled:opacity-50"
                                        title="Simpan"
                                      >
                                        {isPending ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                                      </button>
                                    </div>
                                  </form>
                                </td>
                              </tr>
                            ) : (
                              <tr
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`transition duration-100 ${
                                  snapshot.isDragging ? 'bg-slate-800' : 'hover:bg-slate-900/40'
                                }`}
                                style={{
                                  ...(provided.draggableProps.style as React.CSSProperties),
                                  display: snapshot.isDragging ? 'table' : 'table-row',
                                }}
                              >
                                <td className="py-3 px-4 text-center text-slate-500 font-mono text-xs tabular-nums">
                                  <div className="flex items-center gap-2">
                                    {/* Drag Handle */}
                                    <div
                                      {...provided.dragHandleProps}
                                      className="p-1 text-slate-500 hover:text-slate-350 cursor-grab active:cursor-grabbing touch-none"
                                      style={{
                                        touchAction: 'none'
                                      }}
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                    <span>{index + 1}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 font-semibold text-slate-200">
                                  {item.title}
                                </td>
                                <td className="py-3 px-4 text-center font-mono font-normal text-xs text-slate-300 tabular-nums">
                                  {durationMinutes} Menit
                                </td>
                                <td className="py-3 px-4">
                                  {renderPicBadges(item)}
                                </td>
                                <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs tabular-nums">
                                  {formatSessionTime(room.rundownStartTime, currentOffset, durationMinutes)}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => setEditingItemId(item.id)}
                                      disabled={isPending}
                                      className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition duration-150 cursor-pointer min-h-[32px] min-w-[32px] inline-flex items-center justify-center select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                      title="Edit Sesi"
                                      aria-label={`Edit Sesi ${item.title}`}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(item.id, item.title)}
                                      disabled={isPending}
                                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition duration-150 cursor-pointer min-h-[32px] min-w-[32px] inline-flex items-center justify-center select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                                      title="Hapus Sesi"
                                      aria-label={`Hapus Sesi ${item.title}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Draggable>
                        );
                      });
                    })()}
                    {provided.placeholder}
                  </tbody>
                )}
              </Droppable>
            </table>
          </div>
        </div>
      </div>
    </DragDropContext>
    </div>
  );
}


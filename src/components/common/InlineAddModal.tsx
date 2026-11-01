import React, { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { dbService } from '../../services/storage';
import { Project, Customer, Property, Adviser, Vendor } from '../../types';

export type InlineAddType =
  | 'project'
  | 'customer'
  | 'plot'
  | 'flat'
  | 'adviser'
  | 'vendor'
  | 'projectType'
  | 'propertyType'
  | 'plotPosition'
  | 'expenseCategory';

interface InlineAddModalProps {
  type: InlineAddType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRecordId: string, label: string) => void;
  defaultProjectId?: string;
}

export const InlineAddModal: React.FC<InlineAddModalProps> = ({
  type,
  isOpen,
  onClose,
  onSuccess,
  defaultProjectId,
}) => {
  if (!isOpen) return null;

  const db = dbService.getDatabase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [formData, setFormData] = useState<Record<string, any>>({
    projectId: defaultProjectId || (db.projects[0]?.id ?? ''),
    type: 'Plot',
    commissionType: 'Percentage',
    commissionRate: 2,
  });

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const currentDb = dbService.getDatabase();

      if (type === 'project') {
        if (!formData.name?.trim() || !formData.code?.trim()) {
          setError('Project Name and Code are required.');
          setLoading(false);
          return;
        }
        const newProj: Project = {
          id: `proj-${Date.now()}`,
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          address: formData.address || '',
          type: formData.projectType || 'Plotted Layout',
          startDate: formData.startDate || new Date().toISOString().split('T')[0],
          status: 'Active',
          totalUnits: Number(formData.totalUnits) || 10,
          notes: formData.notes || '',
          createdAt: new Date().toISOString().split('T')[0],
          createdBy: 'Authorized User',
        };
        currentDb.projects.push(newProj);
        dbService.saveDatabase(currentDb);
        dbService.logAudit('Authorized User', 'ADD_PROJECT_INLINE', 'Projects', `Created project ${newProj.name} (${newProj.code})`);
        onSuccess(newProj.id, newProj.name);
      } else if (type === 'customer') {
        if (!formData.name?.trim() || !formData.mobileNumber?.trim()) {
          setError('Customer Name and Mobile Number are required.');
          setLoading(false);
          return;
        }
        const newCust: Customer = {
          id: `cust-${Date.now()}`,
          name: formData.name.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          address: formData.address || '',
          aadhaarNumber: formData.aadhaarNumber || '',
          panNumber: formData.panNumber || '',
          whatsappNumber: formData.whatsappNumber || formData.mobileNumber.trim(),
          email: formData.email || '',
          createdAt: new Date().toISOString().split('T')[0],
        };
        currentDb.customers.push(newCust);
        dbService.saveDatabase(currentDb);
        dbService.logAudit('Authorized User', 'ADD_CUSTOMER_INLINE', 'Customers', `Created customer ${newCust.name}`);
        onSuccess(newCust.id, newCust.name);
      } else if (type === 'plot' || type === 'flat') {
        const isPlot = type === 'plot';
        const num = formData.number?.trim();
        const pId = formData.projectId || currentDb.projects[0]?.id;
        const project = currentDb.projects.find((p) => p.id === pId);

        if (!num) {
          setError(`${isPlot ? 'Plot' : 'Flat'} Number is required.`);
          setLoading(false);
          return;
        }

        const areaSqFt = Number(formData.areaSqFt) || 1000;
        const ratePerSqFt = Number(formData.ratePerSqFt) || (isPlot ? 1500 : 3500);
        const totalPrice = areaSqFt * ratePerSqFt;
        const areaSqMtr = Number((areaSqFt * 0.092903).toFixed(2));

        const newProp: Property = {
          id: `prop-${Date.now()}`,
          projectId: pId,
          projectName: project ? project.name : 'Project',
          propertyType: isPlot ? 'Plot' : 'Flat',
          number: num,
          areaSqFt,
          areaSqMtr,
          ratePerSqFt,
          totalPrice,
          status: 'Available',
          superBuiltUpArea: isPlot ? undefined : areaSqFt,
          carpetArea: isPlot ? undefined : Number((areaSqFt * 0.76).toFixed(0)),
          parkingArea: isPlot ? undefined : 120,
          remarks: formData.remarks || '',
        };
        currentDb.properties.push(newProp);
        dbService.saveDatabase(currentDb);
        dbService.logAudit('Authorized User', 'ADD_PROPERTY_INLINE', 'Properties', `Added ${newProp.propertyType} ${newProp.number} in ${newProp.projectName}`);
        onSuccess(newProp.id, `${newProp.number} (${newProp.projectName})`);
      } else if (type === 'adviser') {
        if (!formData.name?.trim() || !formData.mobileNumber?.trim()) {
          setError('Adviser Name and Mobile Number are required.');
          setLoading(false);
          return;
        }
        const newAdv: Adviser = {
          id: `adv-${Date.now()}`,
          name: formData.name.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          address: formData.address || '',
          email: formData.email || '',
          commissionType: formData.commissionType || 'Percentage',
          commissionRate: Number(formData.commissionRate) || 2,
          commissionBasis: formData.commissionType === 'Percentage' ? 'On Property Total Price' : 'Fixed per booking',
          remarks: formData.remarks || '',
          createdAt: new Date().toISOString().split('T')[0],
        };
        currentDb.advisers.push(newAdv);
        dbService.saveDatabase(currentDb);
        dbService.logAudit('Authorized User', 'ADD_ADVISER_INLINE', 'Advisers', `Added adviser ${newAdv.name}`);
        onSuccess(newAdv.id, newAdv.name);
      } else if (type === 'vendor') {
        if (!formData.name?.trim() || !formData.mobileNumber?.trim()) {
          setError('Vendor Name and Mobile are required.');
          setLoading(false);
          return;
        }
        const newVen: Vendor = {
          id: `ven-${Date.now()}`,
          name: formData.name.trim(),
          businessName: formData.businessName || formData.name.trim(),
          contactPerson: formData.contactPerson || formData.name.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          address: formData.address || '',
          gstNumber: formData.gstNumber || '',
          email: formData.email || '',
          openingBalance: Number(formData.openingBalance) || 0,
          currentOutstanding: Number(formData.openingBalance) || 0,
          remarks: formData.remarks || '',
          createdAt: new Date().toISOString().split('T')[0],
        };
        currentDb.vendors.push(newVen);
      } else if (type === 'projectType' || type === 'propertyType' || type === 'plotPosition' || type === 'expenseCategory') {
        const val = (formData.masterValue || '').trim();
        if (!val) {
          setError('Value is required.');
          setLoading(false);
          return;
        }
        if (!currentDb.masterSettings) {
          currentDb.masterSettings = {
            projectTypes: ['Plotted Layout', 'Residential Building', 'Commercial Complex'],
            propertyTypes: ['Plot', 'Flat', 'Villa', 'Farmhouse', 'Row House'],
            plotPositions: ['Front', 'Back', 'Corner', 'Road-Facing', 'Garden-Facing'],
            defaultDevelopmentChargeRate: 100,
            expenseCategories: ['Material', 'Labour', 'Electricity'],
            paymentModes: ['Cash', 'Cheque', 'UPI'],
            labourCategories: ['Mason', 'Helper'],
          };
        }
        const keyMap: Record<string, keyof typeof currentDb.masterSettings> = {
          projectType: 'projectTypes',
          propertyType: 'propertyTypes',
          plotPosition: 'plotPositions',
          expenseCategory: 'expenseCategories',
        };
        const targetKey = keyMap[type];
        const arr = currentDb.masterSettings[targetKey] as string[];
        if (arr && !arr.includes(val)) {
          arr.push(val);
          dbService.saveDatabase(currentDb);
          dbService.logAudit('Authorized User', 'ADD_MASTER_ITEM', 'Master Settings', `Added "${val}" to ${type}`);
        }
        onSuccess(val, val);
      }

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save record.');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'project':
        return 'Quick Add New Project';
      case 'customer':
        return 'Quick Add New Customer';
      case 'plot':
        return 'Quick Add New Plot';
      case 'flat':
        return 'Quick Add New Flat';
      case 'adviser':
        return 'Quick Add New Adviser';
      case 'vendor':
        return 'Quick Add New Material Vendor';
      case 'projectType':
        return 'Add New Project Type';
      case 'propertyType':
        return 'Add New Property Type';
      case 'plotPosition':
        return 'Add New Plot Position';
      case 'expenseCategory':
        return 'Add New Expense Category';
      default:
        return 'Add New Item';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-sm">{getTitle()}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Project Form */}
          {type === 'project' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vishwas Landmark"
                  value={formData.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Project Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VL-01"
                    value={formData.code || ''}
                    onChange={(e) => handleChange('code', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs uppercase focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.projectType || 'Plotted Layout'}
                    onChange={(e) => handleChange('projectType', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="Plotted Layout">Plotted Layout</option>
                    <option value="Residential Building">Residential Building</option>
                    <option value="Commercial Complex">Commercial Complex</option>
                    <option value="Mixed Development">Mixed Development</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location / Address</label>
                <input
                  type="text"
                  placeholder="e.g. Makhmalabad Road, Nashik"
                  value={formData.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </>
          )}

          {/* Customer Form */}
          {type === 'customer' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Baburao Kute"
                  value={formData.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10 digits"
                    value={formData.mobileNumber || ''}
                    onChange={(e) => handleChange('mobileNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PAN Number</label>
                  <input
                    type="text"
                    placeholder="ABCDE1234F"
                    value={formData.panNumber || ''}
                    onChange={(e) => handleChange('panNumber', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs uppercase focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Current city / address"
                  value={formData.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </>
          )}

          {/* Plot or Flat Form */}
          {(type === 'plot' || type === 'flat') && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Project *</label>
                <select
                  value={formData.projectId || db.projects[0]?.id}
                  onChange={(e) => handleChange('projectId', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                >
                  {db.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {type === 'plot' ? 'Plot Number *' : 'Flat Number / BHK *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={type === 'plot' ? 'e.g. Plot No. 15' : 'e.g. Flat 301 (2BHK)'}
                  value={formData.number || ''}
                  onChange={(e) => handleChange('number', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Area (Sq. Ft) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="1200"
                    value={formData.areaSqFt || ''}
                    onChange={(e) => handleChange('areaSqFt', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rate / Sq. Ft (₹)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder={type === 'plot' ? '1500' : '3800'}
                    value={formData.ratePerSqFt || ''}
                    onChange={(e) => handleChange('ratePerSqFt', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </>
          )}

          {/* Adviser Form */}
          {type === 'adviser' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adviser / Broker Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pramod Patil (Pramod Associates)"
                  value={formData.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10 digits"
                    value={formData.mobileNumber || ''}
                    onChange={(e) => handleChange('mobileNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Commission Rule</label>
                  <select
                    value={formData.commissionType || 'Percentage'}
                    onChange={(e) => handleChange('commissionType', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Fixed Amount">Fixed Amount (₹)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Commission Rate ({formData.commissionType === 'Percentage' ? '%' : '₹'})
                </label>
                <input
                  type="number"
                  placeholder={formData.commissionType === 'Percentage' ? '2' : '30000'}
                  value={formData.commissionRate || ''}
                  onChange={(e) => handleChange('commissionRate', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </>
          )}

          {/* Vendor Form */}
          {type === 'vendor' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vendor / Firm Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mahavir Stone & Sand Traders"
                  value={formData.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10 digits"
                    value={formData.mobileNumber || ''}
                    onChange={(e) => handleChange('mobileNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="27AA..."
                    value={formData.gstNumber || ''}
                    onChange={(e) => handleChange('gstNumber', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs uppercase focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </>
          )}

          {(type === 'projectType' || type === 'propertyType' || type === 'plotPosition' || type === 'expenseCategory') && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {type === 'projectType' && 'Project Type Name *'}
                {type === 'propertyType' && 'Property Type Name *'}
                {type === 'plotPosition' && 'Position Name (e.g. Corner, Road-Facing) *'}
                {type === 'expenseCategory' && 'Expense Category Name *'}
              </label>
              <input
                type="text"
                required
                placeholder="Enter new master value..."
                value={formData.masterValue || ''}
                onChange={(e) => handleChange('masterValue', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Will be saved to Master Settings repository and auto-selected.
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{loading ? 'Saving...' : 'Save & Select'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Core services by phase - these are prominently displayed
export const CORE_SERVICES_BY_PHASE = {
  planning: [
    { value: "gpr_scanning", label: "GPR Scanning" },
    { value: "laser_scan_services", label: "Laser Scan Services" },
    { value: "environmental_services", label: "Environmental Services" }
  ],
  design_development: [
    { value: "mep_design_services", label: "MEP Design Services" },
    { value: "prefabrication_consulting", label: "Prefabrication Consulting" },
    { value: "car_access_surveillance", label: "Car Access & Surveillance" }
  ],
  pre_construction: [
    { value: "bim_vdc", label: "BIM / VDC" },
    { value: "mep_coordination", label: "MEP Coordination" },
    { value: "lean_modeling", label: "Lean Modeling" },
    { value: "cad_services", label: "CAD Services" }
  ],
  construction: [
    { value: "site_progress_tracking", label: "Site Progress Tracking" }
  ],
  post_construction: [
    { value: "commissioning", label: "Commissioning" },
    { value: "as_built_plans", label: "As-Built Plans" }
  ]
} as const;

// Additional services by phase - grouped under "Additional Services"
export const ADDITIONAL_SERVICES_BY_PHASE = {
  planning: [],
  design_development: [],
  pre_construction: [
    { value: "cost_estimation", label: "Cost Estimation" },
    { value: "value_engineering", label: "Value Engineering" },
    { value: "constructability_review", label: "Constructability Review" },
    { value: "permit_coordination", label: "Permit Coordination" },
    { value: "contractor_selection", label: "Contractor Selection" }
  ],
  construction: [],
  post_construction: []
} as const;

// Combined services for backward compatibility
export const SERVICES_BY_PHASE = {
  planning: [...CORE_SERVICES_BY_PHASE.planning, ...ADDITIONAL_SERVICES_BY_PHASE.planning],
  design_development: [...CORE_SERVICES_BY_PHASE.design_development, ...ADDITIONAL_SERVICES_BY_PHASE.design_development],
  pre_construction: [...CORE_SERVICES_BY_PHASE.pre_construction, ...ADDITIONAL_SERVICES_BY_PHASE.pre_construction],
  construction: [...CORE_SERVICES_BY_PHASE.construction, ...ADDITIONAL_SERVICES_BY_PHASE.construction],
  post_construction: [...CORE_SERVICES_BY_PHASE.post_construction, ...ADDITIONAL_SERVICES_BY_PHASE.post_construction]
} as const;

// Service categories (discipline-based)
export const SERVICE_CATEGORIES = [
  { value: "architectural", label: "Architectural" },
  { value: "structural", label: "Structural" },
  { value: "mechanical", label: "Mechanical" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" }
] as const;

// All services flattened for easy access
export const ALL_SERVICES = [
  ...SERVICES_BY_PHASE.planning,
  ...SERVICES_BY_PHASE.design_development,
  ...SERVICES_BY_PHASE.pre_construction,
  ...SERVICES_BY_PHASE.construction,
  ...SERVICES_BY_PHASE.post_construction,
  ...SERVICE_CATEGORIES
] as const;

// Helper function to get services for a specific phase
export function getServicesForPhase(phase: keyof typeof SERVICES_BY_PHASE) {
  return SERVICES_BY_PHASE[phase] || [];
}

// Helper function to get service label by value
export function getServiceLabel(value: string) {
  const service = ALL_SERVICES.find(s => s.value === value);
  return service?.label || value;
}

// Phase labels for UI
export const PHASE_LABELS = {
  planning: "Planning",
  design_development: "Design Development", 
  pre_construction: "Pre-Construction",
  construction: "Construction",
  post_construction: "Post-Construction"
} as const;
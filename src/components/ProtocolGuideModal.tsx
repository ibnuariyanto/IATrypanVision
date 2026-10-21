import React from 'react';
import {
  BookOpen,
  X,
  ExternalLink,
  Clock,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Grid,
  FileCheck
} from 'lucide-react';

interface ProtocolGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProtocolGuideModal: React.FC<ProtocolGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Trypan Blue Exclusion Assay & Neubauer Hemocytometer SOP
              </h2>
              <p className="text-xs text-slate-400">
                Standard operating procedure, mathematical principles & quality control guidelines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 leading-relaxed">
          {/* Section 1: Biological Mechanism */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              1. Principle of Trypan Blue Exclusion
            </h3>
            <p>
              Trypan Blue (tetrasodium salt of 3,3&apos;-[(3,3&apos;-dimethyl[1,1&apos;-biphenyl]-4,4&apos;-diyl)bis(azo)]bis[5-amino-4-hydroxynaphthalene-2,7-disulphonic acid], MW 960.81 g/mol) is a synthetic diazo dye. Intact cell membranes with functioning lipid bilayers selectively exclude the polyanionic dye. Cells with damaged, necrotic, or permeabilized membranes allow the dye to enter the cytoplasm, binding electrostatically to intracellular proteins and staining the cell dark blue/indigo under brightfield microscopy.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="font-bold text-emerald-800 block mb-0.5">Viable (Living) Cells:</span>
                <span className="text-emerald-700">
                  Intact membrane excludes trypan blue. Under brightfield phase/focus, viable cells appear spherical and translucent with a prominent bright refracted central optical halo.
                </span>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="font-bold text-blue-800 block mb-0.5">Non-Viable (Dead) Cells:</span>
                <span className="text-blue-700">
                  Compromised membrane permits dye uptake. Cells absorb blue light, appearing distinctly dark indigo/blue with granular cytoplasm and lost refractivity.
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Critical Laboratory Timing Window */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
              <Clock className="w-4 h-4 text-amber-600" />
              Critical Time Window: Count Within 3 to 5 Minutes
            </div>
            <p className="text-amber-800">
              Trypan Blue is intrinsically cytotoxic to living mammalian cells upon prolonged exposure. Cell samples mixed with Trypan Blue must be loaded into the hemocytometer and counted within <strong>3 to 5 minutes</strong> of mixing. If counting is delayed beyond 10–15 minutes, viable cells will begin taking up dye, generating false-positive mortality artifacts.
            </p>
          </div>

          {/* Section 3: Step-by-Step Laboratory Procedure */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <FileCheck className="w-4 h-4 text-blue-600" />
              2. Standard Laboratory Protocol (Neubauer Chamber)
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 pl-1">
              <li>
                <strong>Prepare Reagent:</strong> Ensure 0.4% (w/v) Trypan Blue in phosphate-buffered saline (PBS, pH 7.2–7.4). If dye particles or crystals are visible, filter through a 0.22 µm syringe filter.
              </li>
              <li>
                <strong>Disperse Suspension:</strong> Gently triturate cell culture with a micropipette to dissociate cell doublets/clumps without causing shear stress.
              </li>
              <li>
                <strong>Mix 1:1:</strong> Transfer 50 µL of cell suspension into an Eppendorf tube and add 50 µL of 0.4% Trypan Blue (Dilution Factor = 2.0×). Mix gently by flicking or pipetting 3–4 times.
              </li>
              <li>
                <strong>Load Hemocytometer:</strong> Affix a clean, specialized hemocytometer glass coverslip over the chamber ridges until Newton&apos;s refraction rings are visible. Pipette 10–12 µL of the mixture into the sample notch by capillary action without overflowing into moats.
              </li>
              <li>
                <strong>Focus & Count:</strong> Place chamber under 10× or 20× objective. Count all 4 corner large squares (and central square if desired).
              </li>
            </ol>
          </div>

          {/* Section 4: Mathematical Hemocytometer Formulas */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <Grid className="w-4 h-4 text-blue-600" />
              3. Hemocytometer Mathematical Formulas
            </h3>
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 font-mono text-xs space-y-2">
              <div>
                <span className="text-slate-500 font-sans block text-[11px]">Chamber Dimensions (Improved Neubauer):</span>
                <span>Area of 1 Large Square = 1.0 mm × 1.0 mm = 1.0 mm²</span><br />
                <span>Chamber Depth = 0.1 mm</span><br />
                <span>Volume of 1 Large Square = 1.0 mm² × 0.1 mm = 0.1 mm³ = 10⁻⁴ mL (0.1 µL)</span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-sans block text-[11px]">Viability Percentage:</span>
                <span className="text-emerald-700 font-bold">Viability (%) = [Viable Cells / (Viable Cells + Dead Cells)] × 100%</span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-sans block text-[11px]">Cell Concentration:</span>
                <span className="text-blue-700 font-bold">Concentration (cells/mL) = (Count / Squares) × Dilution Factor × 10,000</span>
              </div>
            </div>
          </div>

          {/* Section 5: Neubauer Border Inclusion/Exclusion Rule */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              4. Neubauer Border Inclusion / Exclusion Rule (The L-Rule)
            </h3>
            <p>
              To eliminate double-counting of cells that lie across the boundaries dividing adjacent squares, standard GLP/ISO protocols require the L-shaped boundary rule:
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-around">
              <div className="text-emerald-700 font-bold flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                TOP & LEFT Triple Lines: COUNTED
              </div>
              <div className="text-red-700 font-bold flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                BOTTOM & RIGHT Triple Lines: EXCLUDED
              </div>
            </div>
          </div>

          {/* Section 6: Peer-Reviewed Scientific Citations */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              Peer-Reviewed Scientific Literature & Standards
            </h3>
            <ul className="space-y-2 text-[11px] text-slate-600">
              <li className="p-2 bg-slate-50 rounded border border-slate-200 flex items-start justify-between gap-2">
                <div>
                  <strong className="text-slate-900 block">Strober, W. (2001).</strong>
                  <span>Trypan Blue Exclusion Test of Cell Viability. <em>Current Protocols in Immunology</em>, Appendix 3B, doi: 10.1002/0471142735.ima03bs21.</span>
                </div>
                <a
                  href="https://pubmed.ncbi.nlm.nih.gov/18432654/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 shrink-0 font-medium"
                >
                  PubMed <ExternalLink className="w-3 h-3" />
                </a>
              </li>

              <li className="p-2 bg-slate-50 rounded border border-slate-200 flex items-start justify-between gap-2">
                <div>
                  <strong className="text-slate-900 block">Louis, K.S., & Siegel, A.C. (2011).</strong>
                  <span>Cell Viability Analysis Using Trypan Blue: A Review. <em>Methods in Molecular Biology</em>, Vol 740, pp. 7–12. Humana Press.</span>
                </div>
                <a
                  href="https://pubmed.ncbi.nlm.nih.gov/21468962/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 shrink-0 font-medium"
                >
                  PubMed <ExternalLink className="w-3 h-3" />
                </a>
              </li>

              <li className="p-2 bg-slate-50 rounded border border-slate-200 flex items-start justify-between gap-2">
                <div>
                  <strong className="text-slate-900 block">Freshney, R.I. (2015).</strong>
                  <span>Culture of Animal Cells: A Manual of Basic Technique and Specialized Applications, 7th Edition. John Wiley & Sons.</span>
                </div>
                <span className="text-slate-400 font-mono text-[10px]">Reference Standard</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors text-xs"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};

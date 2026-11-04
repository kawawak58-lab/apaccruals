import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import "./YearEndAccrualForm.css";
import { getExpenseClassNames, getExpenseClassRules } from "./lib/ExpenseClasses";
import { getTaxCodeNames } from "./lib/TaxCodes";
import { getTransactionTypeNames } from "./lib/TransactionTypes";
import { getCompanyNames } from "./lib/Companies";
import { getSuppliers } from "./lib/Suppliers";
import { getProfitCenters } from "./lib/ProfitCenter";
import { getGLAccounts } from "./lib/GlAccount";
import { useToast } from "./lib/toast";
import { useAppView } from "./lib/appView";
import { canManageAccrualSetup } from './lib/access';
import { findExactLookup } from "./accrualLookup";
import { submitAccrual, updateAccrualDraft } from "./lib/AccrualSubmissions";
import UploadDataDialog from "./components/UploadDataDialog";
import AccrualEntryTable from "./components/AccrualEntryTable";
import ExcelPastePreview from "./components/ExcelPastePreview";
import { prepareExcelPaste, restoreDeletedEntry } from "./lib/accrualClipboard";
import AccrualCutoffNotice from "./components/AccrualCutoffNotice";
import { fetchCollection } from "./lib/adminCrud";
import { supabase } from "./lib/supabase";
import { formatDisplayDate, getAccrualSetup, getAccrualWindowStatus } from "./lib/AccrualSetup";
import {
  ACCRUAL_UPLOAD_COLUMNS,
  buildAccrualUploadPayloads,
  buildAccrualUploadTemplateSample,
} from "./lib/accrualBulkUpload";
import { downloadAccrualTemplateWorkbook } from "./lib/accrualTemplateWorkbook";
import { getAccrualSequenceKey, groupAccrualRowsBySequence } from "./lib/accrualEntryGroups";

function AccrualFormSkeleton({ retryCount, maxRetries }) {
  return (
    <div className="body">
      <div className="formWrapper">
        <div className="formHeader skeletonFormHeader">
          <div className="formHeaderBar">
            <div className="skeletonHeaderCopy">
              <span className="skeletonBlock accrualSkeletonTitle" />
              <span className="skeletonBlock accrualSkeletonText" />
            </div>
            <span className="skeletonBlock accrualSkeletonButton" />
          </div>
        </div>

        <div className="formSection sectionCard accrualSkeletonCard">
          <div className="cardHeading">
            <span className="skeletonBlock accrualSkeletonSectionTitle" />
            <span className="skeletonBlock accrualSkeletonSectionText" />
          </div>
          <div className="accrualSkeletonGrid accrualSkeletonHeaderGrid">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`header-skeleton-${index}`} className="accrualSkeletonField">
                <span className="skeletonBlock accrualSkeletonLabel" />
                <span className="skeletonBlock accrualSkeletonInput" />
              </div>
            ))}
          </div>
        </div>

        <div className="formSection sectionCard accrualSkeletonCard">
          <div className="cardHeading">
            <span className="skeletonBlock accrualSkeletonSectionTitle" />
            <span className="skeletonBlock accrualSkeletonSectionText short" />
          </div>
          <div className="accrualSkeletonField accrualSkeletonSingleField">
            <span className="skeletonBlock accrualSkeletonLabel" />
            <span className="skeletonBlock accrualSkeletonInput" />
          </div>
        </div>

        <div className="formSection sectionCard accrualSkeletonCard">
          <div className="cardHeading">
            <span className="skeletonBlock accrualSkeletonSectionTitle" />
            <span className="skeletonBlock accrualSkeletonSectionText" />
          </div>
          <div className="lineItemsHeader">
            <span className="skeletonBlock accrualSkeletonButton secondary" />
          </div>
          <div className="lineItemCard accrualSkeletonLineItem">
            <div className="lineItemHeader">
              <span className="skeletonBlock accrualSkeletonLineTitle" />
            </div>
            <div className="accrualSkeletonGrid accrualSkeletonLineGrid">
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={`line-skeleton-${index}`} className="accrualSkeletonField">
                  <span className="skeletonBlock accrualSkeletonLabel" />
                  <span
                    className={`skeletonBlock accrualSkeletonInput${
                      index === 8 ? " textarea" : ""
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="formFooter accrualEntryFooter">
          <div className="accrualSkeletonFooter">
            <span className="skeletonBlock accrualSkeletonButton" />
            <div className="accrualSkeletonLoadingNote">
              Loading form data...
              {retryCount > 0 ? ` Retry attempt ${retryCount}/${maxRetries}` : ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClosedChickenIllustration() {
  return (
    <svg
      className="accrualClosedSvg"
      viewBox="240 0 440 680"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      aria-labelledby="accrualClosedTitleSvg accrualClosedDescSvg"
    >
      <title id="accrualClosedTitleSvg">Entry closed - cartoon chicken facing front on a ladder</title>
      <desc id="accrualClosedDescSvg">
        A cartoon chicken in overalls and cap, facing the viewer, climbing a ladder and holding a paintbrush
      </desc>

      <defs>
        <style>
          {`
            @keyframes wingWave {
              0%,100%{transform:rotate(0deg)}
              25%{transform:rotate(-38deg)}
              70%{transform:rotate(14deg)}
            }
            @keyframes bodyBob {
              0%,100%{transform:translateY(0)}
              50%{transform:translateY(-4px)}
            }
            @keyframes blinkEye {
              0%,90%,100%{transform:scaleY(1)}
              95%{transform:scaleY(0.05)}
            }
            @keyframes wattleWobble {
              0%,100%{transform:rotate(-6deg)}
              50%{transform:rotate(6deg)}
            }
            .chicken-body{animation:bodyBob 2.5s ease-in-out infinite;transform-origin:445px 390px}
            .wave-wing{animation:wingWave 1s ease-in-out infinite;transform-origin:510px 345px}
            .eye-l{animation:blinkEye 3.5s ease-in-out infinite;transform-origin:428px 272px}
            .eye-r{animation:blinkEye 3.5s ease-in-out infinite;transform-origin:462px 272px}
            .wattle{animation:wattleWobble 1.1s ease-in-out infinite;transform-origin:445px 342px}
          `}
        </style>
      </defs>

      <ellipse cx="500" cy="80" rx="52" ry="20" fill="white" opacity="0.35" />
      <ellipse cx="535" cy="68" rx="36" ry="18" fill="white" opacity="0.35" />
      <ellipse cx="472" cy="72" rx="30" ry="15" fill="white" opacity="0.35" />
      <ellipse cx="180" cy="100" rx="38" ry="15" fill="white" opacity="0.3" />
      <ellipse cx="210" cy="90" rx="28" ry="13" fill="white" opacity="0.3" />

      <g fill="#36a89e" opacity="0.55">
        <rect x="8" y="332" width="38" height="228" />
        <rect x="42" y="288" width="44" height="272" />
        <rect x="80" y="360" width="22" height="200" />
        <rect x="98" y="308" width="48" height="252" />
        <rect x="140" y="250" width="52" height="310" />
        <rect x="196" y="334" width="36" height="226" />
        <rect x="228" y="292" width="26" height="268" />
        <rect x="250" y="350" width="40" height="210" />
        <rect x="296" y="326" width="32" height="234" />
        <rect x="334" y="366" width="26" height="194" />
        <rect x="520" y="352" width="26" height="208" />
        <rect x="544" y="300" width="40" height="260" />
        <rect x="578" y="278" width="48" height="282" />
        <rect x="622" y="336" width="34" height="224" />
        <rect x="650" y="302" width="22" height="258" />
        <rect x="154" y="286" width="8" height="8" fill="#2e9088" opacity="0.6" />
        <rect x="170" y="286" width="8" height="8" fill="#2e9088" opacity="0.6" />
        <rect x="154" y="306" width="8" height="8" fill="#2e9088" opacity="0.6" />
        <rect x="170" y="306" width="8" height="8" fill="#2e9088" opacity="0.6" />
        <rect x="560" y="322" width="8" height="8" fill="#2e9088" opacity="0.6" />
        <rect x="576" y="322" width="8" height="8" fill="#2e9088" opacity="0.6" />
        <rect x="560" y="342" width="8" height="8" fill="#2e9088" opacity="0.6" />
        <rect x="576" y="342" width="8" height="8" fill="#2e9088" opacity="0.6" />
      </g>


      <rect x="388" y="590" width="52" height="44" rx="4" fill="#e8e8e0" stroke="#c0b898" strokeWidth="2.5" />
      <rect x="388" y="590" width="52" height="12" rx="4" fill="#d0c8a8" stroke="#c0b898" strokeWidth="1.5" />
      <path d="M398 590 Q414 574 438 590" fill="none" stroke="#b0a888" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="414" cy="598" rx="20" ry="5" fill="#5bbcd4" opacity="0.6" />

      <g stroke="#d8d0b0" strokeWidth="7" strokeLinecap="round">
        <line x1="395" y1="120" x2="355" y2="610" />
        <line x1="505" y1="120" x2="545" y2="610" />
      </g>
      <g stroke="#c8c098" strokeWidth="5" strokeLinecap="round">
        <line x1="392" y1="168" x2="508" y2="168" />
        <line x1="387" y1="222" x2="513" y2="222" />
        <line x1="381" y1="276" x2="519" y2="276" />
        <line x1="376" y1="330" x2="524" y2="330" />
        <line x1="370" y1="384" x2="530" y2="384" />
        <line x1="365" y1="438" x2="535" y2="438" />
        <line x1="359" y1="492" x2="541" y2="492" />
        <line x1="354" y1="546" x2="546" y2="546" />
      </g>

      <g className="chicken-body">
        <path d="M395 385 Q360 355 342 320" fill="none" stroke="#c8a030" strokeWidth="16" strokeLinecap="round" />
        <path d="M395 392 Q356 368 336 336" fill="none" stroke="#e0bc50" strokeWidth="10" strokeLinecap="round" />
        <path d="M397 400 Q365 380 350 355" fill="none" stroke="#d4b040" strokeWidth="8" strokeLinecap="round" />
        <ellipse cx="341" cy="318" rx="9" ry="16" fill="#c8a030" transform="rotate(-28 341 318)" />
        <ellipse cx="334" cy="334" rx="8" ry="14" fill="#d4b840" transform="rotate(-18 334 334)" />
        <ellipse cx="348" cy="353" rx="7" ry="12" fill="#e0c850" transform="rotate(-8 348 353)" />

        <ellipse cx="445" cy="395" rx="72" ry="78" fill="#f5f0d8" stroke="#d4c070" strokeWidth="2.5" />
        <ellipse cx="445" cy="410" rx="46" ry="52" fill="#fdfaf0" opacity="0.65" />

        <path d="M415 362 Q445 354 475 362 L480 428 Q445 438 410 428 Z" fill="#4a7fd4" stroke="#2a5ab0" strokeWidth="1.5" />
        <rect x="420" y="310" width="10" height="55" rx="5" fill="#4a7fd4" stroke="#2a5ab0" strokeWidth="1" />
        <rect x="465" y="310" width="10" height="55" rx="5" fill="#4a7fd4" stroke="#2a5ab0" strokeWidth="1" />
        <rect x="433" y="378" width="24" height="20" rx="3" fill="#3a6dc0" stroke="#2a5ab0" strokeWidth="1" />
        <rect x="420" y="318" width="10" height="7" rx="2" fill="#f0c830" stroke="#c09010" strokeWidth="1" />
        <rect x="465" y="318" width="10" height="7" rx="2" fill="#f0c830" stroke="#c09010" strokeWidth="1" />
        <path d="M410 428 Q445 442 480 428 L486 468 Q445 478 404 468 Z" fill="#4a7fd4" stroke="#2a5ab0" strokeWidth="1.5" />

        <path d="M378 370 Q350 400 345 435" fill="none" stroke="#d4b840" strokeWidth="26" strokeLinecap="round" />
        <path d="M378 370 Q350 400 345 435" fill="none" stroke="#ecd860" strokeWidth="14" strokeLinecap="round" />
        <path d="M368 385 Q348 410 344 432" fill="none" stroke="#c8a030" strokeWidth="2" opacity="0.5" strokeLinecap="round" />

        <path d="M428 465 L418 520" stroke="#e8a020" strokeWidth="12" strokeLinecap="round" />
        <path d="M462 465 L474 520" stroke="#e8a020" strokeWidth="12" strokeLinecap="round" />
        <path d="M418 520 L396 530" stroke="#e8a020" strokeWidth="7" strokeLinecap="round" />
        <path d="M418 520 L416 534" stroke="#e8a020" strokeWidth="7" strokeLinecap="round" />
        <path d="M418 520 L432 528" stroke="#e8a020" strokeWidth="7" strokeLinecap="round" />
        <path d="M474 520 L452 530" stroke="#e8a020" strokeWidth="7" strokeLinecap="round" />
        <path d="M474 520 L474 534" stroke="#e8a020" strokeWidth="7" strokeLinecap="round" />
        <path d="M474 520 L488 528" stroke="#e8a020" strokeWidth="7" strokeLinecap="round" />
        <ellipse cx="413" cy="530" rx="22" ry="10" fill="#8b4513" stroke="#5a2d0a" strokeWidth="1.5" />
        <ellipse cx="478" cy="528" rx="22" ry="10" fill="#8b4513" stroke="#5a2d0a" strokeWidth="1.5" />

        <ellipse cx="445" cy="316" rx="24" ry="26" fill="#f5eecc" stroke="#d4c060" strokeWidth="1.5" />
        <ellipse cx="445" cy="278" rx="56" ry="52" fill="#f8f2d8" stroke="#d4c060" strokeWidth="2" />

        <ellipse cx="445" cy="238" rx="56" ry="13" fill="#d4a020" stroke="#b08010" strokeWidth="1.5" />
        <path d="M400 240 Q445 215 490 240 Q488 224 445 220 Q402 224 400 240 Z" fill="#e8b828" stroke="#b08010" strokeWidth="1.5" />
        <circle cx="445" cy="218" r="5" fill="#d4a020" stroke="#b08010" strokeWidth="1" />

        <path d="M425 232 Q430 210 437 225 Q441 205 445 222 Q449 205 453 222 Q460 210 465 232 Q445 238 425 232 Z" fill="#e83030" stroke="#b01010" strokeWidth="1.5" />

        <g className="wattle">
          <ellipse cx="445" cy="336" rx="11" ry="16" fill="#e83030" stroke="#b01010" strokeWidth="1.5" />
        </g>

        <path d="M432 296 L445 316 L458 296 Z" fill="#e8a020" stroke="#c07010" strokeWidth="1.5" />
        <path d="M436 298 L445 312 L440 298 Z" fill="#f0c040" opacity="0.5" />

        <g className="eye-l">
          <ellipse cx="422" cy="272" rx="16" ry="16" fill="white" stroke="#c0a040" strokeWidth="1.5" />
          <ellipse cx="424" cy="274" rx="9" ry="9" fill="#1a1000" />
          <ellipse cx="421" cy="271" rx="4" ry="4" fill="white" opacity="0.85" />
        </g>

        <g className="eye-r">
          <ellipse cx="468" cy="272" rx="16" ry="16" fill="white" stroke="#c0a040" strokeWidth="1.5" />
          <ellipse cx="470" cy="274" rx="9" ry="9" fill="#1a1000" />
          <ellipse cx="467" cy="271" rx="4" ry="4" fill="white" opacity="0.85" />
        </g>

        <path d="M408 258 Q422 250 436 256" fill="none" stroke="#8a6010" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M454 256 Q468 250 482 258" fill="none" stroke="#8a6010" strokeWidth="2.5" strokeLinecap="round" />

        <ellipse cx="400" cy="286" rx="14" ry="9" fill="#f08060" opacity="0.25" />
        <ellipse cx="490" cy="286" rx="14" ry="9" fill="#f08060" opacity="0.25" />

        <path d="M398 372 Q415 363 430 372" fill="none" stroke="#c8b050" strokeWidth="1.5" opacity="0.4" />
        <path d="M392 398 Q410 388 428 396" fill="none" stroke="#c8b050" strokeWidth="1.5" opacity="0.4" />
        <path d="M460 370 Q476 362 492 370" fill="none" stroke="#c8b050" strokeWidth="1.5" opacity="0.4" />
        <path d="M464 396 Q480 387 496 394" fill="none" stroke="#c8b050" strokeWidth="1.5" opacity="0.4" />
      </g>

      <g className="wave-wing">
        <path d="M510 355 Q542 322 562 292" fill="none" stroke="#4a7fd4" strokeWidth="22" strokeLinecap="round" />
        <path d="M562 292 Q576 262 580 235" fill="none" stroke="#e8c848" strokeWidth="18" strokeLinecap="round" />
        <path d="M562 292 Q576 262 580 235" fill="none" stroke="#c8a020" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <ellipse cx="581" cy="224" rx="14" ry="18" fill="#e8c040" stroke="#c0a020" strokeWidth="1.5" />
        <rect x="581" y="162" width="8" height="68" rx="3" fill="#c8a060" stroke="#907030" strokeWidth="1.5" transform="rotate(8 585 196)" />
        <rect x="579" y="160" width="12" height="10" rx="2" fill="#c0c0c0" stroke="#909090" strokeWidth="1" transform="rotate(8 585 165)" />
        <path d="M577 152 Q585 130 593 152" fill="#e05030" stroke="#b03010" strokeWidth="1" transform="rotate(8 585 141)" />
        <path d="M579 152 Q585 136 591 152" fill="#d04020" opacity="0.6" transform="rotate(8 585 144)" />
        <path d="M586 158 Q588 172 587 182" fill="none" stroke="#e05030" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      </g>
    </svg>
  );
}

const ACCRUAL_DRAFT_STORAGE_KEY = "year-end-accrual:draft";

const defaultAccrualFields = {
  expenseclass: "",
  company: "",
  supplier: "",
  supplierName: "",
  invoiceNo: "",
};

function createEmptyLineItem(id) {
  return {
    id,
    sequence: String(id),
    ...defaultAccrualFields,
    supplierSearch: "",
    suppliers: [],
    supplierTotal: 0,
    supplierPage: 1,
    showSupplierDropdown: false,
    grossAmount: "",
    transType: "",
    vat: "",
    taxCode: "",
    glaccount: "",
    glaccountName: "",
    glSearch: "",
    glAccounts: [],
    glPage: 1,
    glTotal: 0,
    showGLDropdown: false,
    profitcenter: "",
    profitcenterName: "",
    profitSearch: "",
    profitCenters: [],
    profitPage: 1,
    profitTotal: 0,
    showProfitDropdown: false,
    remarks: "",
  };
}

function hydrateDraftLineItem(item, fallbackId) {
  const base = createEmptyLineItem(fallbackId);

  return {
    ...base,
    id: Number.isFinite(Number(item?.id)) ? Number(item.id) : fallbackId,
    sequence: String(item?.sequence ?? item?.line_number ?? fallbackId),
    expenseclass: String(item?.expenseclass ?? ""),
    company: String(item?.company ?? ""),
    supplier: String(item?.supplier ?? ""),
    supplierName: String(item?.supplierName ?? ""),
    invoiceNo: String(item?.invoiceNo ?? ""),
    supplierSearch: String(item?.supplierSearch ?? ""),
    grossAmount: String(item?.grossAmount || ""),
    transType: String(item?.transType || ""),
    vat: String(item?.vat || ""),
    taxCode: String(item?.taxCode || ""),
    glaccount: String(item?.glaccount || ""),
    glaccountName: String(item?.glaccountName || ""),
    glSearch: String(item?.glSearch || ""),
    profitcenter: String(item?.profitcenter || ""),
    profitcenterName: String(item?.profitcenterName || ""),
    profitSearch: String(item?.profitSearch || ""),
    remarks: String(item?.remarks || ""),
    glPage: Number.isFinite(Number(item?.glPage)) ? Number(item.glPage) : 1,
    profitPage: Number.isFinite(Number(item?.profitPage)) ? Number(item.profitPage) : 1,
    glAccounts: [],
    profitCenters: [],
    glTotal: 0,
    profitTotal: 0,
    showGLDropdown: false,
    showProfitDropdown: false,
  };
}

function lineItemsFromSubmission(submission) {
  return [...(submission?.accrual_submission_lines || [])]
    .sort((left, right) => Number(left.line_number || 0) - Number(right.line_number || 0))
    .map((line, index) => hydrateDraftLineItem({
      id: index + 1,
      sequence: "1",
      expenseclass: submission.expense_class,
      company: submission.company,
      supplier: submission.supplier_code,
      supplierName: submission.supplier_name,
      supplierSearch: submission.supplier_code,
      invoiceNo: submission.invoice_no,
      grossAmount: line.gross_amount,
      transType: line.transaction_type,
      vat: line.vat,
      taxCode: line.tax_code,
      glaccount: line.glaccount_code,
      glaccountName: line.glaccount_name,
      glSearch: line.glaccount_code,
      profitcenter: line.profitcenter_code,
      profitcenterName: line.profitcenter_name,
      profitSearch: line.profitcenter_code,
      remarks: line.remarks,
    }, index + 1));
}

function lineItemHasDraftContent(item) {
  return Boolean(
    item?.expenseclass || item?.company || item?.supplier || item?.supplierName ||
      item?.invoiceNo || item?.supplierSearch || item?.grossAmount ||
      item?.transType ||
      item?.vat ||
      item?.taxCode ||
      item?.glaccount ||
      item?.glaccountName ||
      item?.glSearch ||
      item?.profitcenter ||
      item?.profitcenterName ||
      item?.profitSearch ||
      item?.remarks
  );
}

function readAccrualDraft() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawDraft = window.localStorage.getItem(ACCRUAL_DRAFT_STORAGE_KEY);
    if (!rawDraft) {
      return null;
    }

    const parsedDraft = JSON.parse(rawDraft);
    const legacyHeader = { ...defaultAccrualFields, ...(parsedDraft?.headerInfo || {}) };
    const lineItems = Array.isArray(parsedDraft?.lineItems)
      ? parsedDraft.lineItems.map((item, index) => hydrateDraftLineItem(item, index + 1))
      : [createEmptyLineItem(1)];
    if (lineItems.length && parsedDraft?.headerInfo) {
      lineItems[0] = {
        ...lineItems[0],
        ...Object.fromEntries(Object.keys(defaultAccrualFields).map((key) => [key, lineItems[0][key] || legacyHeader[key]])),
        supplierSearch: lineItems[0].supplierSearch || String(parsedDraft?.supplierSearch || ""),
      };
    }

    const nextLineItemCounter = lineItems.reduce(
      (maxId, item) => Math.max(maxId, Number(item.id) || 0),
      1
    );

    return {
      lineItems: lineItems.length > 0 ? lineItems : [createEmptyLineItem(1)],
      lineItemCounter:
        Number.isFinite(Number(parsedDraft?.lineItemCounter)) &&
        Number(parsedDraft.lineItemCounter) >= nextLineItemCounter
          ? Number(parsedDraft.lineItemCounter)
          : nextLineItemCounter,
    };
  } catch (error) {
    console.warn("Failed to read saved accrual draft:", error);
    return null;
  }
}

function clearAccrualDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACCRUAL_DRAFT_STORAGE_KEY);
}

function hasDraftContent({ lineItems }) {
  return Boolean(
    (lineItems || []).some((item) => lineItemHasDraftContent(item))
  );
}

function summarizeAccrualGroup(group) {
  const item = group.headerItem;
  return {
    sequence: Number.isInteger(Number(group.sequenceKey)) ? `Seq. ${group.sequenceKey}` : "Entry",
    expenseClass: item.expenseclass || "—",
    company: item.company || "—",
    supplier: item.supplier || "—",
    supplierName: item.supplierName || "—",
    invoiceNo: item.invoiceNo || "—",
    entryCount: group.items.length,
    grossAmount: group.items.reduce((total, lineItem) => {
      const amount = Number(lineItem.grossAmount || 0);
      return total + (Number.isFinite(amount) ? amount : 0);
    }, 0),
  };
}

function formatAccrualCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export default function YearEndAccrualForm({ currentUser, onFullscreenChange, editingSubmission, onEditCancel, onEditSaved }) {
  const { setActiveView, openAccrualDetails } = useAppView();
  const { showToast } = useToast();
  const savedDraftRef = useRef(readAccrualDraft());
  // Each table row is an independent accrual submission.
  const [lineItems, setLineItems] = useState(
    () => editingSubmission ? lineItemsFromSubmission(editingSubmission) : savedDraftRef.current?.lineItems || [createEmptyLineItem(1)]
  );
  const [lineItemErrors, setLineItemErrors] = useState(() => editingSubmission ? lineItemsFromSubmission(editingSubmission).map(() => ({})) : [{}]);
  const [deletedEntries, setDeletedEntries] = useState([]);
  const [pastePreview, setPastePreview] = useState(null);
  const pasteRequest = useRef(0);
  const [lineItemCounter, setLineItemCounter] = useState(
    () => editingSubmission ? Math.max(1, editingSubmission.accrual_submission_lines?.length || 1) : savedDraftRef.current?.lineItemCounter || 1
  );

  // ---------- Modal ----------
  const [showModal, setShowModal] = useState(false);
  const [submittedAccrualGroups, setSubmittedAccrualGroups] = useState([]);
  const [showSupplierEnrollmentModal, setShowSupplierEnrollmentModal] = useState(false);
  const [showSupplierEnrollmentNotice, setShowSupplierEnrollmentNotice] = useState(false);
  const [supplierEnrollmentNotice, setSupplierEnrollmentNotice] = useState({
    suppliercode: "",
    suppliername: "",
    company: "",
  });
  const [supplierEnrollmentForm, setSupplierEnrollmentForm] = useState({
    suppliercode: "",
    suppliername: "",
    company: "",
  });
  const [isSavingSupplierEnrollment, setIsSavingSupplierEnrollment] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadSaving, setUploadSaving] = useState(false);

  // ---------- Dropdown data with caching ----------
  const [companies, setCompanies] = useState([]);
  const [expenseClass, setExpenseClass] = useState([]);
  const [expenseClassRules, setExpenseClassRules] = useState([]);
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [taxCodes, setTaxCodes] = useState([]);
  const supplierLimit = 50;

  // Cache for API responses
  const cacheRef = useRef({
    companies: null,
    expenseClass: null,
    expenseClassRules: null,
    transactionTypes: null,
    taxCodes: null,
  });

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addConfirmOpen, setAddConfirmOpen] = useState(false);
  const [expandedPreviewGroups, setExpandedPreviewGroups] = useState(() => new Set());
  const accrualSubmissionPreview = useMemo(
    () => groupAccrualRowsBySequence(lineItems).map((group) => ({
      ...summarizeAccrualGroup(group),
      sequenceKey: group.sequenceKey,
      items: group.items,
    })),
    [lineItems]
  );
  const previousAccrualWindowLockedRef = useRef(true);

  // Track previous search values to prevent duplicate requests
  const prevSupplierSearchRef = useRef({});
  const prevGLSearchesRef = useRef({});
  const prevProfitSearchesRef = useRef({});

  // Track static data fetch attempts
  const [staticDataLoading, setStaticDataLoading] = useState(true);
  const [staticDataError, setStaticDataError] = useState(false);
  const staticDataRetryRef = useRef(0);
  const maxStaticDataRetries = 5;
  const [accrualSetup, setAccrualSetup] = useState({
    start_date: "",
    cutoff_date: "",
  });
  const [accrualSetupLoading, setAccrualSetupLoading] = useState(true);
  const [accrualSetupError, setAccrualSetupError] = useState("");
  /*

      alert("❌ Failed to get control number. Check console.");
    }
  };
  
  */
  // ---------- Fetch static lists with caching and retry ----------
  useEffect(() => {
    const fetchStaticDataWithRetry = async () => {
      // Use cached data if available
      if (cacheRef.current.companies) {
        setCompanies(cacheRef.current.companies);
        setExpenseClass(cacheRef.current.expenseClass);
        setExpenseClassRules(cacheRef.current.expenseClassRules);
        setTransactionTypes(cacheRef.current.transactionTypes);
        setTaxCodes(cacheRef.current.taxCodes);
        setStaticDataLoading(false);
        return;
      }

      let delay = 2000;

      while (staticDataRetryRef.current < maxStaticDataRetries) {
        try {
          setStaticDataLoading(true);
          setStaticDataError(false);

          const [expenseList, expenseRules, transactionList, taxList, companiesList] = await Promise.all([
            getExpenseClassNames(),
            getExpenseClassRules(),
            getTransactionTypeNames(),
            getTaxCodeNames(),
            getCompanyNames()
          ]);

          if (
            !companiesList.length ||
            !expenseList.length ||
            !transactionList.length ||
            !taxList.length
          ) {
            throw new Error("Empty data received from one or more sources");
          }

          cacheRef.current = {
            companies: companiesList,
            expenseClass: expenseList,
            expenseClassRules: expenseRules,
            transactionTypes: transactionList,
            taxCodes: taxList,
          };

          setCompanies(companiesList);
          setExpenseClass(expenseList);
          setExpenseClassRules(expenseRules);
          setTransactionTypes(transactionList);
          setTaxCodes(taxList);
          setStaticDataLoading(false);
          setStaticDataError(false);

          console.log("✅ Static data loaded successfully");
          return;

        } catch (err) {
          staticDataRetryRef.current++;
          console.warn(
            `⚠️ Static data fetch attempt ${staticDataRetryRef.current}/${maxStaticDataRetries} failed:`,
            err.message
          );

          if (staticDataRetryRef.current >= maxStaticDataRetries) {
            setStaticDataError(true);
            setStaticDataLoading(false);
            console.error("❌ Failed to load static data after maximum retries");
            return;
          }

          console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
          await sleep(delay);
          delay = Math.min(delay * 2, 32000);
        }
      }
    };

    fetchStaticDataWithRetry();
  }, []);

  const loadAccrualSetup = useCallback(async (options = {}) => {
    const { silent = false } = options;

    if (!silent) {
      setAccrualSetupLoading(true);
    }
    setAccrualSetupError("");

    try {
      const setup = await getAccrualSetup();
      setAccrualSetup(setup);
    } catch (error) {
      console.error("Failed to load accrual setup:", error);
      setAccrualSetupError(error.message || "Unable to load accrual setup.");
    } finally {
      if (!silent) {
        setAccrualSetupLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadAccrualSetup();
  }, [loadAccrualSetup]);

  useEffect(() => {
    const refreshSetupIfVisible = () => {
      if (document.visibilityState === "visible") {
        loadAccrualSetup({ silent: true });
      }
    };

    window.addEventListener("focus", refreshSetupIfVisible);
    window.addEventListener('accrual-setup-updated', refreshSetupIfVisible);
    const setupRefreshTimer = window.setInterval(refreshSetupIfVisible, 30000);
    document.addEventListener("visibilitychange", refreshSetupIfVisible);

    return () => {
      window.removeEventListener("focus", refreshSetupIfVisible);
      window.removeEventListener('accrual-setup-updated', refreshSetupIfVisible);
      window.clearInterval(setupRefreshTimer);
      document.removeEventListener("visibilitychange", refreshSetupIfVisible);
    };
  }, [loadAccrualSetup]);

  useEffect(() => {
    const setupChannel = supabase
      .channel("accrual-setup-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "accrual_filing_setups",
        },
        () => {
          void loadAccrualSetup({ silent: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(setupChannel);
    };
  }, [loadAccrualSetup]);

  useEffect(() => {
    if (editingSubmission) return undefined;
    if (typeof window === "undefined") {
      return undefined;
    }

    const nextDraft = {
      lineItems: lineItems.map((item) => ({
        id: item.id,
        sequence: item.sequence,
        expenseclass: item.expenseclass,
        company: item.company,
        supplier: item.supplier,
        supplierName: item.supplierName,
        invoiceNo: item.invoiceNo,
        supplierSearch: item.supplierSearch,
        grossAmount: item.grossAmount,
        transType: item.transType,
        vat: item.vat,
        taxCode: item.taxCode,
        glaccount: item.glaccount,
        glaccountName: item.glaccountName,
        glSearch: item.glSearch,
        glPage: item.glPage,
        profitcenter: item.profitcenter,
        profitcenterName: item.profitcenterName,
        profitSearch: item.profitSearch,
        profitPage: item.profitPage,
        remarks: item.remarks,
      })),
      lineItemCounter,
    };

    const timeoutId = window.setTimeout(() => {
      if (!hasDraftContent(nextDraft)) {
        clearAccrualDraft();
        return;
      }

      window.localStorage.setItem(ACCRUAL_DRAFT_STORAGE_KEY, JSON.stringify(nextDraft));
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [editingSubmission, lineItems, lineItemCounter]);

  // Supplier search
  useEffect(() => {
    const activeRows = lineItems.filter((item) => item.company && item.supplierSearch?.trim().length >= 2);
    if (!activeRows.length) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        for (const row of activeRows) {
          const searchKey = `${row.company}-${row.supplierSearch}-${row.supplierPage}`;
          if (prevSupplierSearchRef.current[row.id] === searchKey) continue;
          prevSupplierSearchRef.current[row.id] = searchKey;
          const { suppliers: fetchedSuppliers, total } = await getSuppliers(
            row.company, row.supplierSearch, row.supplierPage, supplierLimit
          );
          const exact = row.supplierPage === 1 ? await findExactLookup({
            rows: fetchedSuppliers, total, search: row.supplierSearch,
            company: row.company, table: "suppliers", codeColumn: "suppliercode",
            nameColumn: "suppliername", codeKey: "supplier",
          }) : null;
          if (cancelled) return;
          setLineItems((items) => items.map((item) => item.id === row.id && item.company === row.company && item.supplierSearch === row.supplierSearch
            ? {
                ...item,
                supplier: exact?.code || item.supplier,
                supplierName: exact?.name || item.supplierName,
                suppliers: row.supplierPage === 1 ? fetchedSuppliers : [...(item.suppliers || []), ...fetchedSuppliers],
                supplierTotal: total,
                showSupplierDropdown: exact ? false : item.showSupplierDropdown,
              }
            : item));
        }
      } catch (err) {
        console.warn("Supplier fetch failed", err);
      }
    }, 350);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [lineItems]);

  const handleSupplierSearchChange = (lineId, value) => {
    delete prevSupplierSearchRef.current[lineId];
    setLineItems((rows) => {
      const target = rows.find((row) => row.id === lineId);
      if (!target) return rows;
      const sequenceKey = getAccrualSequenceKey(target.sequence, target.id);
      return rows.map((row) => {
        if (getAccrualSequenceKey(row.sequence, row.id) !== sequenceKey) return row;
        return {
          ...row,
          supplier: "",
          supplierName: "",
          ...(row.id === lineId ? {
            supplierSearch: value,
            suppliers: [],
            supplierTotal: 0,
            supplierPage: 1,
            showSupplierDropdown: value.trim().length >= 2,
          } : {
            supplierSearch: "",
            suppliers: [],
            supplierTotal: 0,
            supplierPage: 1,
            showSupplierDropdown: false,
          }),
        };
      });
    });
  };

  const handleSequenceChange = (lineId, value) => {
    const rowIndex = lineItems.findIndex((row) => row.id === lineId);
    if (rowIndex < 0) return false;
    const valueText = String(value ?? "").trim();
    const requestedSequence = Number(valueText);
    const otherSequences = new Set(lineItems
      .filter((row) => row.id !== lineId)
      .map((row) => Number(row.sequence))
      .filter((sequence) => Number.isInteger(sequence) && sequence > 0));
    const highestOtherSequence = Math.max(0, ...otherSequences);
    const validPositiveSequence = Number.isInteger(requestedSequence) && requestedSequence > 0;
    const sequenceAlreadyExists = otherSequences.has(requestedSequence);
    const fillsExistingGap = validPositiveSequence && requestedSequence <= highestOtherSequence && !sequenceAlreadyExists;
    const nextSequenceIsContiguous = validPositiveSequence && requestedSequence === highestOtherSequence + 1 &&
      Array.from({ length: highestOtherSequence }, (_, index) => index + 1).every((sequence) => otherSequences.has(sequence));

    if (valueText && !sequenceAlreadyExists && !fillsExistingGap && !nextSequenceIsContiguous) {
      setLineItemErrors((errors) => errors.map((error, index) => index === rowIndex
        ? { ...error, sequence: true }
        : error));
      return false;
    }

    const nextKey = getAccrualSequenceKey(value, lineId);
    const source = lineItems.find((row) => row.id !== lineId && getAccrualSequenceKey(row.sequence, row.id) === nextKey);
    const resetRow = { ...createEmptyLineItem(lineId), sequence: value };
    const copiedHeader = source ? {
      ...Object.fromEntries(Object.keys(defaultAccrualFields).map((field) => [field, source[field] || ""])),
      supplierSearch: source.supplierSearch || source.supplier || "",
    } : {};
    const nextRow = { ...resetRow, ...copiedHeader };
    const remainingRows = lineItems.filter((row) => row.id !== lineId);
    const lastMatchingIndex = source
      ? remainingRows.reduce((lastIndex, row, index) => (
        getAccrualSequenceKey(row.sequence, row.id) === nextKey ? index : lastIndex
      ), -1)
      : -1;
    const insertIndex = lastMatchingIndex >= 0
      ? lastMatchingIndex + 1
      : Math.min(rowIndex, remainingRows.length);
    const insertedRows = [
      ...remainingRows.slice(0, insertIndex),
      nextRow,
      ...remainingRows.slice(insertIndex),
    ];
    const nextRows = valueText ? insertedRows
      .map((row, index) => ({ row, index, sequence: Number(row.sequence) }))
      .sort((left, right) => {
        const leftValid = Number.isInteger(left.sequence) && left.sequence > 0;
        const rightValid = Number.isInteger(right.sequence) && right.sequence > 0;
        if (leftValid && rightValid && left.sequence !== right.sequence) return left.sequence - right.sequence;
        if (leftValid !== rightValid) return leftValid ? -1 : 1;
        return left.index - right.index;
      })
      .map(({ row }) => row)
      : insertedRows;
    setLineItems(nextRows);
    setLineItemErrors((errors) => {
      const errorsById = new Map(lineItems.map((row, index) => [row.id, errors[index] || {}]));
      return nextRows.map((row) => row.id === lineId ? {} : errorsById.get(row.id) || {});
    });
    delete prevSupplierSearchRef.current[lineId];
    delete prevGLSearchesRef.current[lineId];
    delete prevProfitSearchesRef.current[lineId];
    return true;
  };

  const updateHeaderField = (lineId, field, value) => {
    setLineItems((rows) => {
      const target = rows.find((row) => row.id === lineId);
      if (!target) return rows;
      const sequenceKey = getAccrualSequenceKey(target.sequence, target.id);
      return rows.map((row) => getAccrualSequenceKey(row.sequence, row.id) === sequenceKey
        ? { ...row, [field]: value }
        : row);
    });
  };

  const handleExpenseClassChange = (lineId, expenseclass) => {
    setLineItems((rows) => {
      const target = rows.find((row) => row.id === lineId);
      if (!target) return rows;
      const sequenceKey = getAccrualSequenceKey(target.sequence, target.id);
      const nextRule = expenseClassRules.find((entry) => String(entry.name).trim().toLowerCase() === String(expenseclass).trim().toLowerCase());
      // The selected expense class owns the default invoice number. Reset it
      // when the class changes so a previous value does not mask the new default.
      const invoiceNo = String(nextRule?.default_invoice_no ?? "").trim();
      return rows.map((row) => getAccrualSequenceKey(row.sequence, row.id) === sequenceKey
        ? { ...row, expenseclass, invoiceNo }
        : row);
    });
  };

  const handleCompanyChange = (lineId, company) => {
    delete prevSupplierSearchRef.current[lineId];
    delete prevGLSearchesRef.current[lineId];
    delete prevProfitSearchesRef.current[lineId];
    setLineItems((rows) => {
      const target = rows.find((row) => row.id === lineId);
      if (!target) return rows;
      const sequenceKey = getAccrualSequenceKey(target.sequence, target.id);
      return rows.map((row) => getAccrualSequenceKey(row.sequence, row.id) === sequenceKey ? {
      ...row,
      company,
      supplier: "",
      supplierName: "",
      supplierSearch: "",
      suppliers: [],
      supplierPage: 1,
      supplierTotal: 0,
      showSupplierDropdown: false,
      glaccount: "",
      glaccountName: "",
      glSearch: "",
      glAccounts: [],
      glPage: 1,
      glTotal: 0,
      showGLDropdown: false,
      profitcenter: "",
      profitcenterName: "",
      profitSearch: "",
      profitCenters: [],
      profitPage: 1,
      profitTotal: 0,
      showProfitDropdown: false,
      } : row);
    });
  };

  const selectSupplier = (lineId, supplier) => {
    setLineItems((rows) => {
      const target = rows.find((row) => row.id === lineId);
      if (!target) return rows;
      const sequenceKey = getAccrualSequenceKey(target.sequence, target.id);
      return rows.map((row) => getAccrualSequenceKey(row.sequence, row.id) === sequenceKey ? {
      ...row,
      supplier: supplier.supplier,
      supplierName: supplier.name,
      supplierSearch: supplier.supplier,
      showSupplierDropdown: false,
      } : row);
    });
  };

  const loadMoreSuppliers = (lineId) => {
    setLineItems((rows) => rows.map((row) => row.id === lineId ? { ...row, supplierPage: row.supplierPage + 1 } : row));
  };

  // GL Account search handler
  const handleGLSearchChange = useCallback((lineId, value) => {
    delete prevGLSearchesRef.current[lineId];
    setLineItems(prev =>
      prev.map(li =>
        li.id === lineId
          ? { ...li, glSearch: value, glaccount: "", glaccountName: "", glAccounts: [], glTotal: 0, glPage: 1, showGLDropdown: value.length >= 2 }
          : li
      )
    );
  }, []);

  const activeGLRequests = useMemo(
    () =>
      lineItems
        .filter((lineItem) => lineItem.glSearch && lineItem.glSearch.length >= 2)
        .map((lineItem) => ({
          id: lineItem.id,
          company: lineItem.company,
          glSearch: lineItem.glSearch,
          glPage: lineItem.glPage,
        })),
    [lineItems]
  );

  // Fetch GL accounts
  useEffect(() => {
    if (activeGLRequests.length === 0) return;

    const fetchGLForLines = async () => {
      for (const line of activeGLRequests) {
        if (!line.company) continue;
        const searchKey = `${line.company}-${line.glSearch}-${line.glPage}`;
        
        if (prevGLSearchesRef.current[line.id] === searchKey) {
          continue;
        }

        prevGLSearchesRef.current[line.id] = searchKey;

        try {
          const { glAccounts: fetchedGLAccounts, total } = await getGLAccounts(
            line.company,
            line.glSearch,
            line.glPage,
            50
          );

          const exact = line.glPage === 1 ? await findExactLookup({
            rows: fetchedGLAccounts, total, search: line.glSearch,
            company: line.company, table: "glaccounts", codeColumn: "glaccountcode", nameColumn: "glaccountname",
          }) : null;
          setLineItems(prev =>
            prev.map(li =>
              li.id === line.id && li.company === line.company && li.glSearch === line.glSearch
                ? {
                    ...li,
                    glAccounts: line.glPage === 1 
                      ? fetchedGLAccounts 
                      : [...(li.glAccounts || []), ...fetchedGLAccounts],
                    glTotal: total,
                    ...(exact ? { glaccount: exact.code, glaccountName: exact.name, showGLDropdown: false } : {}),
                  }
                : li
            )
          );
        } catch (err) {
          console.error("Failed to fetch GL Accounts", err);
        }

        await sleep(100);
      }
    };

    const debounceTimer = setTimeout(fetchGLForLines, 500);
    return () => clearTimeout(debounceTimer);
  }, [activeGLRequests]);

  // Profit Center search handler
  const handleProfitSearchChange = useCallback((lineId, value) => {
    delete prevProfitSearchesRef.current[lineId];
    setLineItems(prev =>
      prev.map(li =>
        li.id === lineId
          ? { ...li, profitSearch: value, profitcenter: "", profitcenterName: "", profitCenters: [], profitTotal: 0, profitPage: 1, showProfitDropdown: value.length >= 2 }
          : li
      )
    );
  }, []);

  const activeProfitRequests = useMemo(
    () =>
      lineItems
        .filter((lineItem) => lineItem.profitSearch && lineItem.profitSearch.length >= 2)
        .map((lineItem) => ({
          id: lineItem.id,
          company: lineItem.company,
          profitSearch: lineItem.profitSearch,
          profitPage: lineItem.profitPage,
        })),
    [lineItems]
  );

  // Fetch Profit Centers
  useEffect(() => {
    if (activeProfitRequests.length === 0) return;

    const fetchProfitForLines = async () => {
      for (const line of activeProfitRequests) {
        if (!line.company) continue;
        const searchKey = `${line.company}-${line.profitSearch}-${line.profitPage}`;
        
        if (prevProfitSearchesRef.current[line.id] === searchKey) {
          continue;
        }

        prevProfitSearchesRef.current[line.id] = searchKey;

        try {
          const { profitCenters: fetchedProfitCenters, total } = await getProfitCenters(
            line.company,
            line.profitSearch,
            line.profitPage,
            50
          );

          const exact = line.profitPage === 1 ? await findExactLookup({
            rows: fetchedProfitCenters, total, search: line.profitSearch,
            company: line.company, table: "profitcenters", codeColumn: "profitcentercode", nameColumn: "profitcentername",
          }) : null;
          setLineItems(prev =>
            prev.map(li =>
              li.id === line.id && li.company === line.company && li.profitSearch === line.profitSearch
                ? {
                    ...li,
                    profitCenters: line.profitPage === 1 
                      ? fetchedProfitCenters 
                      : [...(li.profitCenters || []), ...fetchedProfitCenters],
                    profitTotal: total,
                    ...(exact ? { profitcenter: exact.code, profitcenterName: exact.name, showProfitDropdown: false } : {}),
                  }
                : li
            )
          );
        } catch (err) {
          console.error("Failed to fetch Profit Centers", err);
        }

        await sleep(100);
      }
    };

    const debounceTimer = setTimeout(fetchProfitForLines, 500);
    return () => clearTimeout(debounceTimer);
  }, [activeProfitRequests]);

  const loadMoreGLAccounts = (lineId) => {
    setLineItems(prev =>
      prev.map(li =>
        li.id === lineId
          ? { ...li, glPage: li.glPage + 1 }
          : li
      )
    );
  };

  const loadMoreProfitCenters = (lineId) => {
    setLineItems(prev =>
      prev.map(li =>
        li.id === lineId
          ? { ...li, profitPage: li.profitPage + 1 }
          : li
      )
    );
  };

  const addLineItemAfter = (lineId) => {
    const target = lineItems.find((item) => item.id === lineId);
    if (!target) return;
    const newId = lineItemCounter + 1;
    setLineItemCounter(newId);
    const newItem = {
      ...createEmptyLineItem(newId),
      sequence: target.sequence,
      ...Object.fromEntries(Object.keys(defaultAccrualFields).map((field) => [field, target[field] || ""])),
      supplierSearch: target.supplierSearch || target.supplier || "",
    };
    const targetIndex = lineItems.findIndex((item) => item.id === lineId);
    setLineItems((prev) => {
      const currentIndex = prev.findIndex((item) => item.id === lineId);
      if (currentIndex < 0) return prev;
      return [...prev.slice(0, currentIndex + 1), newItem, ...prev.slice(currentIndex + 1)];
    });
    setLineItemErrors((prev) => [...prev.slice(0, targetIndex + 1), {}, ...prev.slice(targetIndex + 1)]);
    return newId;
  };

  const addNextSequenceLineItem = () => {
    const usedSequences = new Set(lineItems
      .map((item) => Number(item.sequence))
      .filter((sequence) => Number.isInteger(sequence) && sequence > 0));
    let nextSequence = 1;
    while (usedSequences.has(nextSequence)) nextSequence += 1;

    const newId = lineItemCounter + 1;
    setLineItemCounter(newId);
    const newItem = { ...createEmptyLineItem(newId), sequence: String(nextSequence) };
    setLineItems((prev) => [...prev, newItem]);
    setLineItemErrors((prev) => [...prev, {}]);
    return newId;
  };

  const removeLineItem = (id) => {
    if (!isDisabled && !showModal && !pastePreview && lineItems.length > 1) {
      const removedIndex = lineItems.findIndex((item) => item.id === id);
      if (removedIndex < 0) return;
      setDeletedEntries((entries) => [...entries, {
        item: lineItems[removedIndex], index: removedIndex,
        previousId: lineItems[removedIndex - 1]?.id, nextId: lineItems[removedIndex + 1]?.id,
      }]);
      setLineItems((prev) => prev.filter((item) => item.id !== id));
      setLineItemErrors((prev) => prev.filter((_, index) => index !== removedIndex));
      delete prevSupplierSearchRef.current[id];
      delete prevGLSearchesRef.current[id];
      delete prevProfitSearchesRef.current[id];
    }
  };

  const updateLineItem = (id, field, value) => {
    setLineItems((items) =>
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const selectGLAccount = (lineId, gl) => {
    setLineItems((items) =>
      items.map((item) =>
        item.id === lineId
          ? {
              ...item,
              glaccount: gl.code,
              glaccountName: gl.name,
              glSearch: gl.code,
              showGLDropdown: false,
            }
          : item
      )
    );
  };

  const selectProfitCenter = (lineId, pc) => {
    setLineItems((items) =>
      items.map((item) =>
        item.id === lineId
          ? {
              ...item,
              profitcenter: pc.code,
              profitcenterName: pc.name,
              profitSearch: pc.code,
              showProfitDropdown: false,
            }
          : item
      )
    );
  };

  const handleManageSuppliers = () => {
    setSupplierEnrollmentForm({
      suppliercode: "",
      suppliername: "",
      company: "",
    });
    setShowSupplierEnrollmentModal(true);
  };

  const closeSupplierEnrollmentModal = () => {
    setShowSupplierEnrollmentModal(false);
    setSupplierEnrollmentForm({
      suppliercode: "",
      suppliername: "",
      company: "",
    });
  };

  const submitSupplierEnrollment = async () => {
    const trimmedSupplierCode = supplierEnrollmentForm.suppliercode.trim();
    const trimmedSupplierName = supplierEnrollmentForm.suppliername.trim();
    const selectedCompany = supplierEnrollmentForm.company;

    if (!trimmedSupplierCode) {
      showToast("Supplier code is required.", "error");
      return;
    }

    if (!trimmedSupplierName) {
      showToast("Supplier name is required.", "error");
      return;
    }

    if (!selectedCompany) {
      showToast("Company is required.", "error");
      return;
    }

    try {
      setIsSavingSupplierEnrollment(true);
      const enrollmentPayload = {
        suppliercode: trimmedSupplierCode,
        suppliername: trimmedSupplierName,
        company: selectedCompany,
      };

      const [{ data: existingSupplier, error: supplierError }, { data: existingEnrollment, error: enrollmentError }] =
        await Promise.all([
          supabase
            .from("suppliers")
            .select("id")
            .eq("suppliercode", enrollmentPayload.suppliercode)
            .eq("suppliername", enrollmentPayload.suppliername)
            .eq("company", enrollmentPayload.company)
            .limit(1),
          supabase
            .from("suppliernenroll")
            .select("id")
            .eq("suppliercode", enrollmentPayload.suppliercode)
            .eq("suppliername", enrollmentPayload.suppliername)
            .eq("company", enrollmentPayload.company)
            .limit(1),
        ]);

      if (supplierError) throw supplierError;
      if (enrollmentError) throw enrollmentError;

      if (existingSupplier?.length) {
        showToast("Supplier already exists for this company.", "error");
        return;
      }

      if (existingEnrollment?.length) {
        showToast("Supplier enrollment is already pending.", "error");
        return;
      }

      const { error } = await supabase.from("suppliernenroll").insert([enrollmentPayload]);

      if (error) throw error;

      setShowSupplierEnrollmentModal(false);
      setSupplierEnrollmentForm({
        suppliercode: "",
        suppliername: "",
        company: "",
      });
      setSupplierEnrollmentNotice({
        suppliercode: enrollmentPayload.suppliercode,
        suppliername: enrollmentPayload.suppliername,
        company: enrollmentPayload.company,
      });
      setShowSupplierEnrollmentNotice(true);
      showToast("Supplier enrollment submitted for approval.", "success");
    } catch (error) {
      console.error("Failed to create supplier enrollment:", error);
      showToast(error.message || "Unable to submit supplier enrollment.", "error");
    } finally {
      setIsSavingSupplierEnrollment(false);
    }
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateLineItems = () => {
    const newLineItemErrors = lineItems.map((item) => {
      const rule = expenseClassRules.find((entry) => String(entry.name).trim().toLowerCase() === String(item.expenseclass || "").trim().toLowerCase());
      const disabledFields = rule?.disabled_fields || [];
      const notRequiredFields = rule?.not_required_fields || [];
      const errors = {};
      const amount = String(item.grossAmount ?? "").trim();
      if (!Number.isInteger(Number(item.sequence)) || Number(item.sequence) < 1) errors.sequence = true;
      if (!item.expenseclass) errors.expenseclass = true;
      if (!item.company) errors.company = true;
      if (!disabledFields.includes("supplier") && !notRequiredFields.includes("supplier") && (!item.supplier || !item.supplierName)) errors.supplier = true;
      if (!disabledFields.includes("invoice_no") && !notRequiredFields.includes("invoice_no") && !item.invoiceNo && !rule?.default_invoice_no) errors.invoiceNo = true;
      if (!amount || !Number.isFinite(Number(amount))) errors.grossAmount = true;
      if (!item.transType) errors.transType = true;
      if (!item.glaccount) errors.glaccount = true;
      if (!item.remarks) errors.remarks = true;
      if (!disabledFields.includes("profit_center") && !notRequiredFields.includes("profit_center") && !item.profitcenter) errors.profitcenter = true;
      if (!disabledFields.includes("vat") && !notRequiredFields.includes("vat") && !item.vat) errors.vat = true;
      if (!disabledFields.includes("tax_code") && !notRequiredFields.includes("tax_code") && !item.taxCode) errors.taxCode = true;
      return errors;
    });

    setLineItemErrors(newLineItemErrors);
    return !newLineItemErrors.some((errors) => Object.keys(errors).length > 0);
  };

  const openSubmissionPreview = () => {
    if (!currentUser?.email || !isValidEmail(currentUser.email)) {
      showToast("A valid requester email is required to submit accruals.", "error");
      return;
    }
    if (!validateLineItems()) {
      showToast("Please fill in all required fields.", "error");
      return;
    }
    setAddConfirmOpen(true);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const currentAccrualWindowStatus = getAccrualWindowStatus(accrualSetup, new Date());
    if (!editingSubmission && (accrualSetupLoading || !currentAccrualWindowStatus.isOpen)) {
      showToast(
        accrualSetupLoading
          ? "Please wait while the accrual setup is loading."
          : currentAccrualWindowStatus.reason,
        "error"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      if (!currentUser?.email || !isValidEmail(currentUser.email)) {
        showToast("A valid requester email is required to submit accruals.", "error");
        return;
      }

      if (!validateLineItems()) {
        showToast("Please fill in all required fields.", "error");
        return;
      }

      const newLineItemErrors = lineItems.map(() => ({}));

      if (editingSubmission) {
        const firstItem = lineItems[0];
        const rule = expenseClassRules.find((entry) => String(entry.name).trim().toLowerCase() === String(firstItem.expenseclass).trim().toLowerCase());
        await updateAccrualDraft(
          editingSubmission.id,
          {
            requester_email: editingSubmission.requester_email || editingSubmission.maker || currentUser.email,
            expense_class: firstItem.expenseclass,
            company: firstItem.company,
            supplier_code: firstItem.supplier || "",
            supplier_name: firstItem.supplierName || "",
            invoice_no: firstItem.invoiceNo || rule?.default_invoice_no || "",
          },
          lineItems.map((lineItem, index) => ({
            line_number: index + 1,
            gross_amount: Number(lineItem.grossAmount || 0),
            glaccount_code: lineItem.glaccount,
            glaccount_name: lineItem.glaccountName || null,
            profitcenter_code: lineItem.profitcenter || "",
            profitcenter_name: lineItem.profitcenterName || null,
            transaction_type: lineItem.transType,
            vat: lineItem.vat || null,
            tax_code: lineItem.taxCode || null,
            remarks: lineItem.remarks,
          }))
        );
        setAddConfirmOpen(false);
        showToast("Accrual updated successfully.", "success");
        onEditSaved?.();
        return;
      }

      const submissionGroups = groupAccrualRowsBySequence(lineItems);

      const controlNumbers = [];
      let failedRow = null;
      let submissionError = null;
      for (let groupIndex = 0; groupIndex < submissionGroups.length; groupIndex += 1) {
        const group = submissionGroups[groupIndex];
        const item = group.headerItem;
        const rule = expenseClassRules.find((entry) => String(entry.name).trim().toLowerCase() === String(item.expenseclass).trim().toLowerCase());
        try {
          const controlNumber = await submitAccrual({
            header: {
              setup_id: accrualSetup.id,
              maker: currentUser.email,
              requester_email: currentUser.email,
              expense_class: item.expenseclass,
              company: item.company,
              supplier_code: item.supplier || "",
              supplier_name: item.supplierName || "",
              invoice_no: item.invoiceNo || rule?.default_invoice_no || null,
              status: 2,
            },
            lineItems: group.items.map((lineItem, lineIndex) => ({
              line_number: lineIndex + 1,
              gross_amount: Number(lineItem.grossAmount || 0),
              glaccount_code: lineItem.glaccount,
              glaccount_name: lineItem.glaccountName || null,
              profitcenter_code: lineItem.profitcenter || "",
              profitcenter_name: lineItem.profitcenterName || null,
              transaction_type: lineItem.transType,
              vat: lineItem.vat || null,
              tax_code: lineItem.taxCode || null,
              remarks: lineItem.remarks,
            })),
          });
          if (!controlNumber) throw new Error("Submission did not return a control number.");
          controlNumbers.push({
            ids: group.items.map((lineItem) => lineItem.id),
            number: controlNumber,
            ...summarizeAccrualGroup(group),
          });
        } catch (error) {
          failedRow = groupIndex;
          submissionError = error;
          break;
        }
      }

      if (controlNumbers.length) {
        setDeletedEntries([]);
        const submittedIds = new Set(controlNumbers.flatMap((entry) => entry.ids));
        const remainingItems = lineItems.filter((item) => !submittedIds.has(item.id));
        const remainingErrors = newLineItemErrors.filter((_, index) => !submittedIds.has(lineItems[index]?.id));
        setSubmittedAccrualGroups(controlNumbers.map(({ number, ...group }) => ({
          ...group,
          controlNumber: number,
        })));
        setAddConfirmOpen(false);
        setShowModal(true);
        showToast(`${controlNumbers.length} accrual group${controlNumbers.length === 1 ? "" : "s"} submitted for confirmation.`, "success");
        if (remainingItems.length) {
          setLineItems(remainingItems);
          setLineItemErrors(remainingErrors);
          if (failedRow !== null) showToast(`Sequence ${submissionGroups[failedRow].sequenceKey} and later sequences were not submitted: ${submissionError?.message || "Please retry."}`, "error");
        } else {
          setLineItems([createEmptyLineItem(1)]);
          setLineItemErrors([{}]);
          setLineItemCounter(1);
          clearAccrualDraft();
        }
        controlNumbers.flatMap(({ ids }) => ids).forEach((id) => {
          delete prevSupplierSearchRef.current[id];
          delete prevGLSearchesRef.current[id];
          delete prevProfitSearchesRef.current[id];
        });
      } else if (submissionError) {
        throw submissionError;
      }

    } catch (error) {
      console.error("Submission error:", error);
      showToast(error.message || "Unable to submit. Please try again later.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const accrualWindowStatus = getAccrualWindowStatus(accrualSetup, new Date());
  const isAccrualWindowLocked = !editingSubmission && (accrualSetupLoading || !accrualWindowStatus.isOpen);
  const isDisabled = !currentUser?.email || staticDataLoading || isAccrualWindowLocked;

  const undoDelete = () => {
    if (isDisabled || showModal || pastePreview || !deletedEntries.length) return;
    const restored = restoreDeletedEntry(lineItems, lineItemErrors, deletedEntries[deletedEntries.length - 1]);
    setLineItems(restored.items);
    setLineItemErrors(restored.errors);
    setDeletedEntries((entries) => entries.slice(0, -1));
  };

  const cancelPaste = () => { pasteRequest.current += 1; setPastePreview(null); };
  const handleExcelPaste = async (text, startRow, startColumn) => {
    if (isDisabled || showModal || pastePreview) return;
    const request = ++pasteRequest.current;
    const snapshot = lineItems;
    setPastePreview({ loading: true });
    try {
      const preview = await prepareExcelPaste({
        text, startRow, startColumn, items: snapshot, counter: lineItemCounter,
        createRow: createEmptyLineItem, editing: Boolean(editingSubmission), rules: expenseClassRules,
        lists: { expenseclass: expenseClass, company: companies, transType: transactionTypes, taxCode: taxCodes, vat: ['Vatable', 'Non-Vatable'] },
        lookup: (field, company, code) => {
          const config = {
            supplier: ['suppliers', 'suppliercode', 'suppliername'],
            glaccount: ['glaccounts', 'glaccountcode', 'glaccountname'],
            profitcenter: ['profitcenters', 'profitcentercode', 'profitcentername'],
          }[field];
          return findExactLookup({ rows: [], total: 1, search: code, company, table: config[0], codeColumn: config[1], nameColumn: config[2] });
        },
      });
      if (pasteRequest.current === request) setPastePreview({ ...preview, snapshot });
    } catch (error) {
      if (pasteRequest.current === request) setPastePreview({ errors: [error.message || 'Unable to validate copied cells.'] });
    }
  };

  const applyExcelPaste = () => {
    if (isDisabled || showModal || pastePreview?.loading || pastePreview?.errors?.length || !pastePreview?.items) return;
    // Lookup responses may refresh dropdown metadata while the preview is open.
    const dataOnly = (rows) => rows.map(({ suppliers, glAccounts, profitCenters, supplierTotal, glTotal, profitTotal, supplierPage, glPage, profitPage, showSupplierDropdown, showGLDropdown, showProfitDropdown, ...row }) => row);
    if (JSON.stringify(dataOnly(lineItems)) !== JSON.stringify(dataOnly(pastePreview.snapshot))) {
      setPastePreview({ errors: ['Entries changed while checking the paste. Cancel and paste again.'] });
      return;
    }
    setLineItems(pastePreview.items);
    setLineItemCounter(pastePreview.counter);
    setLineItemErrors(pastePreview.items.map(() => ({})));
    // A new paste starts a new deletion history; older rows must not be
    // restored into the newly pasted entries.
    setDeletedEntries([]);
    showToast(`${pastePreview.rowCount} rows pasted.`, 'success');
    cancelPaste();
  };
  useEffect(() => {
    if (!onFullscreenChange) {
      return undefined;
    }

    const shouldUseFullscreen = false;
    onFullscreenChange(shouldUseFullscreen);

    return () => {
      onFullscreenChange(false);
    };
  }, [currentUser?.usergroup, isAccrualWindowLocked, onFullscreenChange]);

  useEffect(() => {
    const wasLocked = previousAccrualWindowLockedRef.current;

    if (!wasLocked && isAccrualWindowLocked) {
      showToast(accrualWindowStatus.reason || "Accrual filing is closed.", "warning");
    }

    if (isAccrualWindowLocked && uploadOpen) {
      setUploadOpen(false);
    }

    previousAccrualWindowLockedRef.current = isAccrualWindowLocked;
  }, [accrualWindowStatus.reason, isAccrualWindowLocked, showToast, uploadOpen]);

  const validateAccrualUploadRows = useCallback(
    async (uploadedRows) => {
      if (accrualSetupLoading) {
        throw new Error("Please wait for the accrual setup to finish loading.");
      }

      if (!accrualWindowStatus.isOpen) {
        throw new Error(accrualWindowStatus.reason);
      }

      if (staticDataLoading) {
        throw new Error("Please wait for the accrual form reference data to finish loading.");
      }

      const normalizeValue = (value) => String(value || "").trim();
      const normalizeKey = (value) => normalizeValue(value).toLowerCase();
      const normalizeLooseKey = (value) => normalizeKey(value).replace(/[^a-z0-9]/g, "");
      const isValidUploadEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeValue(value));
      const uniqueValues = (values) =>
        Array.from(
          new Set(
            values.map((value) => normalizeValue(value)).filter(Boolean)
          )
        );
      const supplierCodes = uniqueValues(uploadedRows.map((row) => row.supplier_code));
      const glCodes = uniqueValues(uploadedRows.map((row) => row.glaccount_code));
      const profitCenterCodes = uniqueValues(uploadedRows.map((row) => row.profitcenter_code));
      const fetchRowsByCodes = async (table, columns, codeColumn, codes) => {
        if (codes.length === 0) {
          return [];
        }

        const { data, error } = await supabase
          .from(table)
          .select(columns)
          .in(codeColumn, codes);

        if (error) {
          throw error;
        }

        return data || [];
      };
      const [supplierRows, glRows, profitCenterRows] = await Promise.all([
        fetchRowsByCodes("suppliers", "suppliercode, suppliername, company", "suppliercode", supplierCodes),
        fetchRowsByCodes("glaccounts", "glaccountcode, glaccountname, company", "glaccountcode", glCodes),
        fetchRowsByCodes("profitcenters", "profitcentercode, profitcentername, company", "profitcentercode", profitCenterCodes),
      ]);
      const resolveCompanyCodeMatch = (company, code, exactMap, byCode) => {
        const exactKey = `${normalizeKey(company)}::${normalizeKey(code)}`;
        const exactMatch = exactMap.get(exactKey);
        if (exactMatch) {
          return exactMatch;
        }

        const codeMatches = byCode.get(normalizeKey(code));
        if (!codeMatches) {
          return null;
        }

        const candidates = Array.isArray(codeMatches) ? codeMatches : [codeMatches];
        if (candidates.length === 1) {
          return candidates[0];
        }

        const looseCompany = normalizeLooseKey(company);
        const looseMatches = candidates.filter((candidate) => normalizeLooseKey(candidate.company) === looseCompany);
        if (looseMatches.length === 1) {
          return looseMatches[0];
        }

        const partialMatches = candidates.filter((candidate) => {
          const candidateCompany = normalizeLooseKey(candidate.company);
          return candidateCompany.includes(looseCompany) || looseCompany.includes(candidateCompany);
        });

        if (partialMatches.length === 1) {
          return partialMatches[0];
        }

        return null;
      };
      const resolveAnyCodeMatch = (code, byCode) => {
        const codeMatches = byCode.get(normalizeKey(code));
        if (!codeMatches) {
          return null;
        }

        const candidates = Array.isArray(codeMatches) ? codeMatches : [codeMatches];
        return candidates[0] || null;
      };

      const companySet = new Set(companies.map((value) => normalizeKey(value)));
      const expenseClassSet = new Set(expenseClass.map((value) => normalizeKey(value)));
      const expenseClassRuleMap = new Map(expenseClassRules.map((rule) => [normalizeKey(rule.name), rule]));
      const transactionTypeSet = new Set(transactionTypes.map((value) => normalizeKey(value)));
      const taxCodeSet = new Set(taxCodes.map((value) => normalizeKey(value)));
      const supplierByCompanyAndCode = new Map(
        supplierRows.map((row) => [
          `${normalizeKey(row.company)}::${normalizeKey(row.suppliercode)}`,
          {
            code: normalizeValue(row.suppliercode),
            name: normalizeValue(row.suppliername),
            company: normalizeValue(row.company),
          },
        ])
      );
      const supplierByCode = new Map();
      supplierRows.forEach((row) => {
        const codeKey = normalizeKey(row.suppliercode);
        const nextMatch = {
          code: normalizeValue(row.suppliercode),
          name: normalizeValue(row.suppliername),
          company: normalizeValue(row.company),
        };
        const existing = supplierByCode.get(codeKey);
        if (!existing) {
          supplierByCode.set(codeKey, nextMatch);
        } else if (Array.isArray(existing)) {
          existing.push(nextMatch);
        } else {
          supplierByCode.set(codeKey, [existing, nextMatch]);
        }
      });
      const glByCompanyAndCode = new Map(
        glRows.map((row) => [
          `${normalizeKey(row.company)}::${normalizeKey(row.glaccountcode)}`,
          {
            code: normalizeValue(row.glaccountcode),
            name: normalizeValue(row.glaccountname),
            company: normalizeValue(row.company),
          },
        ])
      );
      const glByCode = new Map();
      glRows.forEach((row) => {
        const codeKey = normalizeKey(row.glaccountcode);
        const nextMatch = {
          code: normalizeValue(row.glaccountcode),
          name: normalizeValue(row.glaccountname),
          company: normalizeValue(row.company),
        };
        const existing = glByCode.get(codeKey);
        if (!existing) {
          glByCode.set(codeKey, nextMatch);
        } else if (Array.isArray(existing)) {
          existing.push(nextMatch);
        } else {
          glByCode.set(codeKey, [existing, nextMatch]);
        }
      });
      const profitCenterByCompanyAndCode = new Map(
        profitCenterRows.map((row) => [
          `${normalizeKey(row.company)}::${normalizeKey(row.profitcentercode)}`,
          {
            code: normalizeValue(row.profitcentercode),
            name: normalizeValue(row.profitcentername),
            company: normalizeValue(row.company),
          },
        ])
      );
      const profitCenterByCode = new Map();
      profitCenterRows.forEach((row) => {
        const codeKey = normalizeKey(row.profitcentercode);
        const nextMatch = {
          code: normalizeValue(row.profitcentercode),
          name: normalizeValue(row.profitcentername),
          company: normalizeValue(row.company),
        };
        const existing = profitCenterByCode.get(codeKey);
        if (!existing) {
          profitCenterByCode.set(codeKey, nextMatch);
        } else if (Array.isArray(existing)) {
          existing.push(nextMatch);
        } else {
          profitCenterByCode.set(codeKey, [existing, nextMatch]);
        }
      });
      const fileRowKeys = new Set();
      const sequenceHeaderMap = new Map();

      return uploadedRows.map((row) => {
        const nextRow = { ...row, __errors: [...(row.__errors || [])] };
        const sequenceValue = normalizeValue(row.sequence);
        const requesterEmail = normalizeValue(row.requester_email);
        const expenseClassValue = normalizeValue(row.expense_class);
        const companyValue = normalizeValue(row.company);
        const supplierCode = normalizeValue(row.supplier_code);
        const supplierName = normalizeValue(row.supplier_name);
        let invoiceNo = normalizeValue(row.invoice_no);
        const expenseClassRule = expenseClassRuleMap.get(normalizeKey(expenseClassValue));
        if (!invoiceNo && expenseClassRule?.default_invoice_no) {
          invoiceNo = normalizeValue(expenseClassRule.default_invoice_no);
          nextRow.invoice_no = invoiceNo;
        }
        const grossAmount = normalizeValue(row.gross_amount);
        const glCode = normalizeValue(row.glaccount_code);
        const profitCenterCode = normalizeValue(row.profitcenter_code);
        const transactionTypeValue = normalizeValue(row.transaction_type);
        const vatValue = normalizeValue(row.vat);
        const taxCodeValue = normalizeValue(row.tax_code);
        const remarksValue = normalizeValue(row.remarks);
        const exactRowKey = [
          sequenceValue,
          requesterEmail,
          expenseClassValue,
          companyValue,
          supplierCode,
          supplierName,
          invoiceNo,
          grossAmount,
          glCode,
          profitCenterCode,
          transactionTypeValue,
          vatValue,
          taxCodeValue,
          remarksValue,
        ]
          .map(normalizeKey)
          .join("::");
        const sequenceHeaderKey = [
          requesterEmail,
          expenseClassValue,
          companyValue,
          supplierCode,
          supplierName,
          invoiceNo,
        ]
          .map(normalizeKey)
          .join("::");

        if (!sequenceValue) {
          nextRow.__errors.push("Missing sequence");
        } else if (!/^\d+$/.test(sequenceValue) || Number(sequenceValue) <= 0) {
          nextRow.__errors.push("Sequence must be a positive whole number");
        }

        if (!requesterEmail) {
          nextRow.__errors.push("Missing requester email");
        } else if (!isValidUploadEmail(requesterEmail)) {
          nextRow.__errors.push("Invalid requester email");
        }

        if (!expenseClassValue) {
          nextRow.__errors.push("Missing expense class");
        } else if (!expenseClassSet.has(normalizeKey(expenseClassValue))) {
          nextRow.__errors.push("Expense class does not exist");
        }

        if (!companyValue) {
          nextRow.__errors.push("Missing company");
        } else if (!companySet.has(normalizeKey(companyValue))) {
          nextRow.__errors.push("Company does not exist");
        }

        const disabledFields = expenseClassRule?.disabled_fields || [];
        const notRequiredFields = expenseClassRule?.not_required_fields || [];
        if (!supplierCode && !disabledFields.includes("supplier") && !notRequiredFields.includes("supplier")) {
          nextRow.__errors.push("Missing supplier code");
        }
        if (companyValue && supplierCode) {
          const supplierMatch = resolveCompanyCodeMatch(
            companyValue,
            supplierCode,
            supplierByCompanyAndCode,
            supplierByCode
          );
          if (!supplierMatch) {
            nextRow.__errors.push("Supplier does not exist for this company");
          } else {
            nextRow.supplier_name = supplierMatch.name;
          }
        }

        if (expenseClassValue && !disabledFields.includes("invoice_no") && !notRequiredFields.includes("invoice_no") && !invoiceNo) {
          nextRow.__errors.push("Invoice no. is required for this expense class");
        }

        if (!grossAmount) {
          nextRow.__errors.push("Missing gross amount");
        } else if (!Number.isFinite(Number(grossAmount))) {
          nextRow.__errors.push("Gross amount must be numeric");
        }

        if (!glCode) {
          nextRow.__errors.push("Missing GL account code");
        }
        if (glCode) {
          const glMatch =
            (companyValue && resolveCompanyCodeMatch(companyValue, glCode, glByCompanyAndCode, glByCode)) ||
            resolveAnyCodeMatch(glCode, glByCode);
          if (!glMatch) {
            nextRow.__errors.push("GL account does not exist in the master list");
          } else {
            nextRow.glaccount_name = glMatch.name;
          }
        }

        if (!profitCenterCode && !disabledFields.includes("profit_center") && !notRequiredFields.includes("profit_center")) {
          nextRow.__errors.push("Missing profit center code");
        }
        if (profitCenterCode) {
          const profitCenterMatch =
            (companyValue &&
              resolveCompanyCodeMatch(
                companyValue,
                profitCenterCode,
                profitCenterByCompanyAndCode,
                profitCenterByCode
              )) ||
            resolveAnyCodeMatch(profitCenterCode, profitCenterByCode);
          if (!profitCenterMatch) {
            nextRow.__errors.push("Profit center does not exist in the master list");
          } else {
            nextRow.profitcenter_name = profitCenterMatch.name;
          }
        }

        if (!transactionTypeValue) {
          nextRow.__errors.push("Missing transaction type");
        } else if (!transactionTypeSet.has(normalizeKey(transactionTypeValue))) {
          nextRow.__errors.push("Transaction type does not exist");
        }

        if (!disabledFields.includes("vat")) {
          if (!vatValue && !notRequiredFields.includes("vat")) {
            nextRow.__errors.push("Missing VAT");
          } else if (vatValue && !["vatable", "non-vatable"].includes(normalizeKey(vatValue))) {
            nextRow.__errors.push("VAT must be Vatable or Non-Vatable");
          }
        }

        if (!disabledFields.includes("tax_code")) {
          if (!taxCodeValue && !notRequiredFields.includes("tax_code")) {
            nextRow.__errors.push("Missing tax code");
          } else if (taxCodeValue && !taxCodeSet.has(normalizeKey(taxCodeValue))) {
            nextRow.__errors.push("Tax code does not exist");
          }
        }

        if (!remarksValue) {
          nextRow.__errors.push("Missing remarks");
        }

        if (sequenceValue) {
          const existingHeaderKey = sequenceHeaderMap.get(sequenceValue);
          if (!existingHeaderKey) {
            sequenceHeaderMap.set(sequenceValue, sequenceHeaderKey);
          } else if (existingHeaderKey !== sequenceHeaderKey) {
            nextRow.__errors.push("Rows with the same sequence must keep the same header details");
          }
        }

        if (fileRowKeys.has(exactRowKey)) {
          nextRow.__errors.push("Duplicate accrual row in file");
        }

        fileRowKeys.add(exactRowKey);
        return nextRow;
      });
    },
    [
      accrualSetupLoading,
      accrualWindowStatus.isOpen,
      accrualWindowStatus.reason,
      companies,
      expenseClass,
      expenseClassRules,
      staticDataLoading,
      taxCodes,
      transactionTypes,
    ]
  );

  const uploadAccrualRows = useCallback(
    async (uploadedRows, options = {}) => {
      if (accrualSetupLoading || !accrualWindowStatus.isOpen) {
        throw new Error(
          accrualSetupLoading
            ? "Please wait while the accrual setup is loading."
            : accrualWindowStatus.reason
        );
      }

      setUploadSaving(true);
      let insertedRows = Math.max(0, Math.min(options.startIndex || 0, uploadedRows.length));

      try {
        const payloadGroups = buildAccrualUploadPayloads(uploadedRows);
        const startIndex = Math.max(0, Math.min(options.startIndex || 0, uploadedRows.length));
        const resumableGroups = [];
        let groupedRowCursor = 0;

        payloadGroups.forEach((payloadGroup) => {
          const nextCursor = groupedRowCursor + payloadGroup.lineItems.length;
          if (nextCursor > startIndex) {
            resumableGroups.push(payloadGroup);
          }
          groupedRowCursor = nextCursor;
        });

        insertedRows = startIndex;
        const controlNumbers = [];
        const submissions = [];

        for (const payloadGroup of resumableGroups) {
          const grossAmount = payloadGroup.lineItems.reduce(
            (total, lineItem) => total + Number(lineItem.gross_amount || 0),
            0
          );
          const controlNumber = await submitAccrual({
            ...payloadGroup,
            header: {
              ...payloadGroup.header,
              setup_id: accrualSetup.id,
              maker: currentUser?.email || payloadGroup.header.requester_email,
            },
          });
          if (controlNumber) {
            controlNumbers.push(controlNumber);
            submissions.push({
              controlNumber,
              company: payloadGroup.header.company || "",
              supplier:
                payloadGroup.header.supplier_name || payloadGroup.header.supplier_code || "",
              invoiceNo: payloadGroup.header.invoice_no || "",
              grossAmount,
            });
          }
          insertedRows += payloadGroup.lineItems.length;

          if (options.onProgress) {
            options.onProgress({
              inserted: insertedRows,
              total: uploadedRows.length,
            });
          }

          await new Promise((resolve) => window.setTimeout(resolve, 0));
        }

        return {
          controlNumbers,
          submissions,
          submissionCount: payloadGroups.length,
          rowCount: uploadedRows.length,
        };
      } catch (error) {
        const resumeFrom = Number.isFinite(error?.uploadRecovery?.resumeFrom)
          ? error.uploadRecovery.resumeFrom
          : insertedRows;
        const uploadError = new Error(error.message || "Upload failed.");
        uploadError.uploadRecovery = {
          canResume: resumeFrom < uploadedRows.length,
          resumeFrom,
          insertedCount: resumeFrom,
          totalCount: uploadedRows.length,
          remainingCount: Math.max(uploadedRows.length - resumeFrom, 0),
          rollbackSupported: false,
          rollbackState: null,
        };
        throw uploadError;
      } finally {
        setUploadSaving(false);
      }
    },
    [accrualSetupLoading, accrualSetup.id, accrualWindowStatus.isOpen, accrualWindowStatus.reason, currentUser]
  );

  const handleAccrualTemplateDownload = useCallback((includeSampleRows = false) => {
    const buildTemplate = async () => {
      const company = companies[0] || "";
      let suppliersForCompany = [];
      let glAccountsForCompany = [];
      let profitCentersForCompany = [];

      if (company) {
        const [supplierRows, glRows, profitCenterRows] = await Promise.all([
          fetchCollection({
            table: "suppliers",
            select: "suppliercode, suppliername, company",
            orderBy: "suppliername",
            filters: { company },
          }),
          fetchCollection({
            table: "glaccounts",
            select: "glaccountcode, glaccountname, company",
            orderBy: "glaccountname",
            filters: { company },
          }),
          fetchCollection({
            table: "profitcenters",
            select: "profitcentercode, profitcentername, company",
            orderBy: "profitcentername",
            filters: { company },
          }),
        ]);

        suppliersForCompany = supplierRows;
        glAccountsForCompany = glRows;
        profitCentersForCompany = profitCenterRows;
      }

      await downloadAccrualTemplateWorkbook({
        companies,
        expenseClasses: expenseClass,
        transactionTypes,
        taxCodes,
        suppliers: suppliersForCompany,
        glAccounts: glAccountsForCompany,
        profitCenters: profitCentersForCompany,
        includeSampleRows,
        filename: includeSampleRows ? "accrual-upload-guide.xlsx" : "accrual-upload-template.xlsx",
      });
    };

    buildTemplate().catch((error) => {
      showToast(error.message || "Unable to generate the accrual template.", "error");
    });
  }, [companies, expenseClass, showToast, taxCodes, transactionTypes]);

  const retryStaticData = () => {
    staticDataRetryRef.current = 0;
    setStaticDataError(false);
    setStaticDataLoading(true);
    
    cacheRef.current = {
      companies: null,
      expenseClass: null,
      expenseClassRules: null,
      transactionTypes: null,
      taxCodes: null,
    };
    
    window.location.reload();
  };

  if (staticDataLoading) {
    return (
      <AccrualFormSkeleton
        retryCount={staticDataRetryRef.current}
        maxRetries={maxStaticDataRetries}
      />
    );
  }

  return (
    <div className={`body${isAccrualWindowLocked ? " bodyLocked" : ""}`}>
      <div className={`formWrapper${isAccrualWindowLocked ? " formWrapperLocked" : ""}`}>
        {/* Error Banner */}
        {staticDataError && (
          <div className="errorBanner">
            <div className="errorBannerContent">
              <strong className="errorBannerTitle">⚠️ Unable to load form data</strong>
              <p className="errorBannerText">
                The form could not load required dropdown data. Please check your connection and try again.
              </p>
            </div>
            <button onClick={retryStaticData} className="retryButton">
              Retry
            </button>
          </div>
        )}

        {accrualSetupError ? (
          <div className="accrualWindowNotice error">
            <div className="accrualWindowNoticeTitle">Accrual setup is unavailable</div>
            <p className="accrualWindowNoticeText">
              {accrualSetupError} New accrual entry is temporarily locked until the setup is available.
            </p>
          </div>
        ) : null}

        {isAccrualWindowLocked ? (
          <section className="filingStatusPage">
            <div className="filingPageHeading">
              <h1>New Accrual</h1>
              <p>New accrual entry is unavailable while the filing period is closed.</p>
            </div>
            <div className="filingStatusCard" aria-live="polite">
              <div className="filingStatusContent">
                <span className="filingStatusBadge">{accrualSetupLoading ? "Checking availability" : accrualSetupError ? "Setup unavailable" : !accrualWindowStatus.isConfigured ? "Setup required" : "Filing closed"}</span>
                <h2>{accrualSetupLoading ? "Checking the accrual period" : accrualSetupError ? "Unable to check filing availability" : !accrualWindowStatus.isConfigured ? "Accrual period not configured" : "Accrual filing is currently closed"}</h2>
                <p>{accrualSetupLoading ? "Please wait while we check when you can submit an accrual." : accrualSetupError ? "We couldn't load the filing dates. Retry the connection or contact your administrator." : !accrualWindowStatus.isConfigured ? "Filing dates haven't been set yet. You can review your submissions while you wait for the period to open." : accrualWindowStatus.reason}</p>
                {!accrualSetupLoading && !accrualSetupError && accrualWindowStatus.isConfigured ? (
                  <dl className="filingStatusDates">
                    <div><dt>Start date</dt><dd>{formatDisplayDate(accrualSetup.start_date)}</dd></div>
                    <div><dt>Cutoff date</dt><dd>{formatDisplayDate(accrualSetup.cutoff_date)}</dd></div>
                  </dl>
                ) : null}
                <div className="filingStatusActions">
                  {canManageAccrualSetup(currentUser) ? <button type="button" className="submitBtn" onClick={() => setActiveView("/accrual-setup")}>Configure accrual period</button> : null}
                  <button type="button" className="tableActionBtn" onClick={() => setActiveView("/accruals")}>View submissions</button>
                  {accrualSetupError ? <button type="button" className="tableActionBtn" onClick={() => loadAccrualSetup()}>Retry</button> : null}
                </div>
                {!canManageAccrualSetup(currentUser) && !accrualSetupLoading ? <p className="filingStatusHelp">Contact your administrator for changes to the filing period.</p> : null}
              </div>
              <div className="filingStatusArt" aria-hidden="true"><ClosedChickenIllustration /></div>
            </div>
          </section>
        ) : (
          <>
        <AccrualCutoffNotice cutoffDate={accrualSetup.cutoff_date} />
        <div className="accrualPageHeaderRow">
          <div className="accrualPageHeadingText">
            <h1 className="h1 accrualPageTitle">{editingSubmission ? "Edit Accrual" : "New Accrual"}</h1>
            <p>{editingSubmission ? `Update the entries for ${editingSubmission.control_number}. Changes remain For Confirmation until confirmed.` : "Record year-end accruals for expenses incurred but not yet invoiced or paid."}</p>
          </div>
          {!editingSubmission ? <button
            type="button"
            className="tableActionBtn accrualHeaderUploadBtn"
            onClick={() => setUploadOpen(true)}
            disabled={staticDataLoading || isAccrualWindowLocked}
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none">
              <path d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5M4 12.5v3h12v-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Upload Accruals
          </button> : null}
        </div>

        <AccrualEntryTable
          onExcelPaste={handleExcelPaste}
          undoDelete={undoDelete}
          deletedEntryCount={deletedEntries.length}
          lineItems={lineItems}
          isEditingExistingAccrual={Boolean(editingSubmission)}
          currentUser={currentUser}
          expenseClass={expenseClass}
          expenseClassRules={expenseClassRules}
          companies={companies}
          transactionTypes={transactionTypes}
          taxCodes={taxCodes}
          lineItemErrors={lineItemErrors}
          isDisabled={isDisabled || Boolean(pastePreview) || showModal || addConfirmOpen}
          isAccrualWindowLocked={isAccrualWindowLocked}
          handleSupplierSearchChange={handleSupplierSearchChange}
          selectSupplier={selectSupplier}
          loadMoreSuppliers={loadMoreSuppliers}
          handleManageSuppliers={handleManageSuppliers}
          updateLineItem={updateLineItem}
          handleGLSearchChange={handleGLSearchChange}
          selectGLAccount={selectGLAccount}
          loadMoreGLAccounts={loadMoreGLAccounts}
          handleProfitSearchChange={handleProfitSearchChange}
          selectProfitCenter={selectProfitCenter}
          loadMoreProfitCenters={loadMoreProfitCenters}
          handleCompanyChange={handleCompanyChange}
          handleSequenceChange={handleSequenceChange}
          handleExpenseClassChange={handleExpenseClassChange}
          updateHeaderField={updateHeaderField}
          setLineItems={setLineItems}
          setLineItemErrors={setLineItemErrors}
          addLineItemAfter={addLineItemAfter}
          addNextSequenceLineItem={addNextSequenceLineItem}
          removeLineItem={removeLineItem}
        />
        {pastePreview && <ExcelPastePreview preview={pastePreview} onCancel={cancelPaste} onApply={applyExcelPaste} />}



    <div className="accrualEntryFooter">
      {editingSubmission ? <button type="button" className="tableActionBtn" disabled={isSubmitting} onClick={onEditCancel}>Cancel</button> : null}
      <button type="button" className="submitBtn" disabled={isSubmitting || isAccrualWindowLocked} onClick={openSubmissionPreview}>{editingSubmission ? "Update" : "Add"}</button>
    </div>
          </>
        )}

    {addConfirmOpen ? (
      <div className="modalOverlay maintenanceOverlay">
        <section className="modalContent maintenanceDialog accrualSubmissionDialog" role="dialog" aria-modal="true" aria-labelledby="addAccrualConfirmTitle">
          <header className="accrualSubmissionHeader">
            <span className="accrualSubmissionEyebrow">{editingSubmission ? "Review changes" : "Review submission"}</span>
            <h2 id="addAccrualConfirmTitle">{editingSubmission ? "Save accrual changes?" : "Submit accruals?"}</h2>
            <p>{editingSubmission ? `This updates ${editingSubmission.control_number}. Its control number stays the same, and the accrual remains For Confirmation.` : "Each Seq. group creates one accrual and receives one control number. The actual numbers will be assigned when you submit."}</p>
          </header>
          <div className="accrualSubmissionBody">
            <div className="accrualSubmissionStats" aria-label="Submission totals">
              <div><span>{editingSubmission ? "Accrual" : "Accruals"}</span><strong>{accrualSubmissionPreview.length}</strong></div>
              <div><span>Entries</span><strong>{lineItems.length}</strong></div>
            </div>
            <div className="accrualSubmissionTableWrap">
              <table className="accrualSubmissionTable">
                <colgroup>{[155, 250, 170, 250, 150, 90, 160, 190].map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
                <thead><tr><th>Group / entries</th><th>Expense classification</th><th>Company</th><th>Supplier</th><th>Invoice no.</th><th>Entries</th><th>Gross amount</th><th>Control number</th></tr></thead>
                <tbody>{accrualSubmissionPreview.map((group) => {
                  const isExpanded = expandedPreviewGroups.has(group.sequenceKey);
                  return <React.Fragment key={group.sequenceKey}>
                    <tr>
                      <td data-label="Group"><div className="accrualPreviewGroupCell"><span className="accrualSequenceBadge">{group.sequence}</span>{group.entryCount > 1 && <button type="button" className="accrualPreviewToggle" aria-expanded={isExpanded} onClick={() => setExpandedPreviewGroups((previous) => { const next = new Set(previous); if (next.has(group.sequenceKey)) next.delete(group.sequenceKey); else next.add(group.sequenceKey); return next; })}>{isExpanded ? "Hide entries" : `View ${group.entryCount} entries`}<span aria-hidden="true">{isExpanded ? "−" : "+"}</span></button>}</div></td>
                      <td data-label="Expense classification" title={group.expenseClass}>{group.expenseClass}</td>
                      <td data-label="Company" title={group.company}>{group.company}</td>
                      <td data-label="Supplier" title={[group.supplier, group.supplierName].filter(Boolean).join(" · ")}><strong>{group.supplier}</strong><small>{group.supplierName}</small></td>
                      <td data-label="Invoice no." title={group.invoiceNo}>{group.invoiceNo}</td>
                      <td data-label="Entries">{group.entryCount}</td>
                      <td data-label="Gross amount" className="accrualSubmissionAmount">{formatAccrualCurrency(group.grossAmount)}</td>
                      <td data-label="Control number"><span className="accrualPendingControl">{editingSubmission?.control_number || "Assigned on submit"}</span></td>
                    </tr>
                    {isExpanded && <tr className="accrualPreviewDetailRow"><td colSpan={8}><div className="accrualPreviewEntries">{group.items.map((entry, index) => <article className="accrualPreviewEntry" key={entry.id || index}>
                      <div className="accrualPreviewEntryHeading"><strong>Entry {index + 1}</strong><strong>{formatAccrualCurrency(entry.grossAmount)}</strong></div>
                      <dl>
                        <div><dt>GL account</dt><dd>{entry.glaccount || "—"}{entry.glaccountName ? ` · ${entry.glaccountName}` : ""}</dd></div>
                        <div><dt>Profit center</dt><dd>{entry.profitcenter || "—"}{entry.profitcenterName ? ` · ${entry.profitcenterName}` : ""}</dd></div>
                        <div><dt>Transaction type</dt><dd>{entry.transType || "—"}</dd></div>
                        <div><dt>VAT / tax code</dt><dd>{[entry.vat, entry.taxCode].filter(Boolean).join(" · ") || "—"}</dd></div>
                        <div className="accrualPreviewRemark"><dt>Remarks</dt><dd>{entry.remarks || "—"}</dd></div>
                      </dl>
                    </article>)}</div></td></tr>}
                  </React.Fragment>;
                })}</tbody>
              </table>
            </div>
            <p className="accrualSubmissionNote">{editingSubmission ? "Your changes will keep this accrual in " : "Submitted accruals will be marked "}<strong>For Confirmation</strong>{editingSubmission ? " status and keep the same control number." : " and can be edited until confirmed."}</p>
          </div>
          {isSubmitting && <div className="accrualSubmissionProgress" role="status"><span className="accrualSubmitSpinner" aria-hidden="true" />{editingSubmission ? "Saving changes to the existing accrual..." : "Creating accruals and assigning control numbers..."}</div>}
          <div className="dialogActions accrualSubmissionActions">
            <button type="button" className="tableActionBtn" autoFocus disabled={isSubmitting} onClick={() => setAddConfirmOpen(false)}>Go back</button>
            <button type="button" className={`submitBtn${isSubmitting ? " isLoading" : ""}`} aria-busy={isSubmitting} disabled={isSubmitting} onClick={handleSubmit}>
              {isSubmitting && <span className="accrualSubmitSpinner" aria-hidden="true" />}
              {isSubmitting ? (editingSubmission ? "Saving..." : "Submitting...") : (editingSubmission ? "Save changes" : `Submit ${accrualSubmissionPreview.length} accrual${accrualSubmissionPreview.length === 1 ? "" : "s"}`)}
            </button>
          </div>
        </section>
      </div>
    ) : null}
    {showSupplierEnrollmentModal && (
      <div className="modalOverlay" onClick={closeSupplierEnrollmentModal}>
        <div
          className="modalContent supplierEnrollmentModal"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="supplierEnrollmentHeader">
            <div className="supplierEnrollmentEyebrow">Enrollment Request</div>
            <h2 className="modalTitle supplierEnrollmentTitle">
              Supplier Enrollment
            </h2>
            <p className="modalText supplierEnrollmentText">
              Please provide the supplier details below for review and pending enrollment approval.
            </p>
          </div>

          <div className="formGroup supplierEnrollmentField">
            <label className="label">
              Supplier Code / Vendor Code <span className="required">*</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="Enter the supplier code"
              value={supplierEnrollmentForm.suppliercode}
              onChange={(e) =>
                setSupplierEnrollmentForm((prev) => ({
                  ...prev,
                  suppliercode: e.target.value,
                }))
              }
              disabled={isSavingSupplierEnrollment}
            />
          </div>

          <div className="formGroup supplierEnrollmentField">
            <label className="label">
              Supplier Name / Vendor Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="Enter the supplier name"
              value={supplierEnrollmentForm.suppliername}
              onChange={(e) =>
                setSupplierEnrollmentForm((prev) => ({
                  ...prev,
                  suppliername: e.target.value,
                }))
              }
              disabled={isSavingSupplierEnrollment}
            />
          </div>

          <div className="formGroup supplierEnrollmentField">
            <label className="label">
              Company Assignment <span className="required">*</span>
            </label>
            <select
              className="select"
              value={supplierEnrollmentForm.company}
              onChange={(e) =>
                setSupplierEnrollmentForm((prev) => ({
                  ...prev,
                  company: e.target.value,
                }))
              }
              disabled={isSavingSupplierEnrollment}
            >
              <option value="">Select a company</option>
              {companies.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </div>

          <div className="supplierEnrollmentActions">
            <button
              type="button"
              className="supplierEnrollmentSecondaryBtn"
              onClick={closeSupplierEnrollmentModal}
              disabled={isSavingSupplierEnrollment}
            >
              Close
            </button>
            <button
              type="button"
              className="submitBtn supplierEnrollmentPrimaryBtn"
              onClick={submitSupplierEnrollment}
              disabled={isSavingSupplierEnrollment}
            >
              {isSavingSupplierEnrollment ? "Submitting Request..." : "Submit Request"}
            </button>
          </div>
        </div>
      </div>
    )}

    {showSupplierEnrollmentNotice && (
      <div
        className="modalOverlay"
        onClick={() => setShowSupplierEnrollmentNotice(false)}
      >
        <div
          className="modalContent supplierEnrollmentModal supplierEnrollmentNoticeModal"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="supplierEnrollmentHeader">
            <div className="supplierEnrollmentEyebrow">Request Submitted</div>
            <h2 className="modalTitle supplierEnrollmentTitle">
              Supplier Pending Approval
            </h2>
            <p className="modalText supplierEnrollmentText">
              The requested supplier has been submitted and is now pending approval.
            </p>
          </div>

          <div className="supplierEnrollmentNoticeBody">
            <div className="supplierEnrollmentNoticeRow">
              <span className="supplierEnrollmentNoticeLabel">Supplier Code</span>
              <span className="supplierEnrollmentNoticeValue">{supplierEnrollmentNotice.suppliercode}</span>
            </div>
            <div className="supplierEnrollmentNoticeRow">
              <span className="supplierEnrollmentNoticeLabel">Supplier Name</span>
              <span className="supplierEnrollmentNoticeValue">{supplierEnrollmentNotice.suppliername}</span>
            </div>
            <div className="supplierEnrollmentNoticeRow">
              <span className="supplierEnrollmentNoticeLabel">Company</span>
              <span className="supplierEnrollmentNoticeValue">{supplierEnrollmentNotice.company}</span>
            </div>
          </div>

          <div className="supplierEnrollmentActions">
            <button
              type="button"
              className="submitBtn supplierEnrollmentPrimaryBtn"
              onClick={() => setShowSupplierEnrollmentNotice(false)}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal */}
    {showModal && (
      <div className="modalOverlay maintenanceOverlay">
        <section className="modalContent maintenanceDialog accrualSubmissionDialog accrualSubmissionSuccess" role="dialog" aria-modal="true" aria-labelledby="accrualSubmittedTitle">
          <header className="accrualSubmissionHeader accrualSuccessHeader">
            <span className="accrualSuccessIcon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg></span>
            <div><span className="accrualSubmissionEyebrow">Submission complete</span><h2 id="accrualSubmittedTitle">Submitted for confirmation</h2><p>{submittedAccrualGroups.length} accrual{submittedAccrualGroups.length === 1 ? " was" : "s were"} created and can be edited until confirmed.</p></div>
          </header>
          <div className="accrualSubmissionBody">
            <div className="accrualSubmissionTableWrap">
              <table className="accrualSubmissionTable accrualSubmittedTable">
                <thead><tr><th>Control number</th><th>Group</th><th>Expense classification</th><th>Company</th><th>Supplier</th><th>Invoice no.</th><th>Entries</th><th>Gross amount</th></tr></thead>
                <tbody>{submittedAccrualGroups.map((group) => (
                  <tr key={group.controlNumber}>
                    <td data-label="Control number"><button type="button" className="accrualControlNumber accrualSubmittedControlLink" onClick={() => { setShowModal(false); openAccrualDetails(group.controlNumber); }}>{group.controlNumber}</button></td>
                    <td data-label="Group"><span className="accrualSequenceBadge">{group.sequence}</span></td>
                    <td data-label="Expense classification">{group.expenseClass}</td>
                    <td data-label="Company">{group.company}</td>
                    <td data-label="Supplier"><strong>{group.supplier}</strong>{group.supplierName !== "—" && <small>{group.supplierName}</small>}</td>
                    <td data-label="Invoice no.">{group.invoiceNo}</td>
                    <td data-label="Entries">{group.entryCount}</td>
                    <td data-label="Gross amount" className="accrualSubmissionAmount">{formatAccrualCurrency(group.grossAmount)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <p className="accrualSubmissionNote">You can find these records in <strong>All Accruals</strong> while they are awaiting confirmation.</p>
          </div>
          <div className="dialogActions accrualSubmissionActions"><button type="button" className="submitBtn" onClick={() => setShowModal(false)}>Close</button></div>
        </section>
      </div>
    )}

    <UploadDataDialog
      open={uploadOpen}
      title="Upload Accruals"
      description="Upload accruals from a CSV file. Each entry will be submitted as For Confirmation and can be edited until confirmed."
      templateColumns={ACCRUAL_UPLOAD_COLUMNS}
      previewOnlyColumns={[
        { key: "supplier_name", label: "Supplier Name", after: "supplier_code" },
        { key: "glaccount_name", label: "GL Account Name", after: "glaccount_code" },
        { key: "profitcenter_name", label: "Profit Center Name", after: "profitcenter_code" },
      ]}
      templateSampleRow={buildAccrualUploadTemplateSample({
        expenseClasses: expenseClass,
        companies,
        transactionTypes,
        taxCodes,
        suppliers: [],
        glAccounts: [],
        profitCenters: [],
      })}
      templateFileName="accrual-upload-template.xlsx"
      templateDownloadHandler={() => handleAccrualTemplateDownload(false)}
      templateGuideDownloadHandler={() => handleAccrualTemplateDownload(true)}
      expectedLabel="accrual"
      validateRows={validateAccrualUploadRows}
      onClose={() => setUploadOpen(false)}
      onUpload={uploadAccrualRows}
      saving={uploadSaving}
    />
  </div>
</div>
);
}

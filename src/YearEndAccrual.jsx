import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import "./YearEndAccrualForm.css";
import { getExpenseClassNames } from "./lib/ExpenseClasses";
import { getTaxCodeNames } from "./lib/TaxCodes";
import { getTransactionTypeNames } from "./lib/TransactionTypes";
import { getCompanyNames } from "./lib/Companies";
import { getSuppliers } from "./lib/Suppliers";
import { getProfitCenters } from "./lib/ProfitCenter";
import { getGLAccounts } from "./lib/GlAccount";
import { useToast } from "./lib/toast";
import { submitAccrual } from "./lib/AccrualSubmissions";
import UploadDataDialog from "./components/UploadDataDialog";
import { fetchCollection } from "./lib/adminCrud";
import { supabase } from "./lib/supabase";
import { formatDisplayDate, getAccrualSetup, getAccrualWindowStatus } from "./lib/AccrualSetup";
import {
  ACCRUAL_UPLOAD_COLUMNS,
  NON_DEDUCTIBLE_EXPENSE,
  buildAccrualUploadPayloads,
  buildAccrualUploadTemplateSample,
} from "./lib/accrualBulkUpload";
import { downloadAccrualTemplateWorkbook } from "./lib/accrualTemplateWorkbook";

// Debounce hook to prevent excessive API calls
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

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

        <div className="formFooter">
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
      viewBox="0 0 680 680"
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

      <text x="52" y="148" fontFamily="Arial Black, Arial, sans-serif" fontSize="68" fontWeight="900" fill="white" opacity="0.95">Entry</text>
      <text x="52" y="218" fontFamily="Arial Black, Arial, sans-serif" fontSize="68" fontWeight="900" fill="white" opacity="0.95">closed!</text>
      <text x="55" y="265" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="700" fill="white" opacity="0.8">for now</text>

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

function FieldTip({ children }) {
  return <div className="fieldTip">{children}</div>;
}

const ACCRUAL_DRAFT_STORAGE_KEY = "year-end-accrual:draft";

const defaultHeaderInfo = {
  email: "",
  expenseclass: "",
  company: "",
  supplier: "",
  supplierName: "",
  invoiceNo: "",
};

function createEmptyLineItem(id) {
  return {
    id,
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

function lineItemHasDraftContent(item) {
  return Boolean(
    item?.grossAmount ||
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
    const lineItems = Array.isArray(parsedDraft?.lineItems)
      ? parsedDraft.lineItems.map((item, index) => hydrateDraftLineItem(item, index + 1))
      : [createEmptyLineItem(1)];

    const nextLineItemCounter = lineItems.reduce(
      (maxId, item) => Math.max(maxId, Number(item.id) || 0),
      1
    );

    return {
      headerInfo: {
        ...defaultHeaderInfo,
        ...(parsedDraft?.headerInfo || {}),
      },
      supplierSearch: String(parsedDraft?.supplierSearch || ""),
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

function hasDraftContent({ headerInfo, supplierSearch, lineItems }) {
  return Boolean(
    supplierSearch ||
      Object.values(headerInfo || {}).some((value) => String(value || "").trim()) ||
      (lineItems || []).some((item) => lineItemHasDraftContent(item))
  );
}

export default function YearEndAccrualForm({ currentUser, onFullscreenChange }) {
  const { showToast } = useToast();
  const savedDraftRef = useRef(readAccrualDraft());
  // ---------- Header ----------
  const [headerInfo, setHeaderInfo] = useState(
    () => savedDraftRef.current?.headerInfo || defaultHeaderInfo
  );

  // ---------- Line Items ----------
  const [headerErrors, setHeaderErrors] = useState({});
  const [lineItems, setLineItems] = useState(
    () => savedDraftRef.current?.lineItems || [createEmptyLineItem(1)]
  );
  const [lineItemErrors, setLineItemErrors] = useState([{}]);
  const [lineItemCounter, setLineItemCounter] = useState(
    () => savedDraftRef.current?.lineItemCounter || 1
  );

  // ---------- Modal ----------
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
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
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [taxCodes, setTaxCodes] = useState([]);

  const [suppliers, setSuppliers] = useState([]);
  const [supplierSearch, setSupplierSearch] = useState(
    () => savedDraftRef.current?.supplierSearch || ""
  );
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierTotal, setSupplierTotal] = useState(0);
  const supplierLimit = 50;
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  const [emailSuggestions, setEmailSuggestions] = useState([]);
  const commonDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "bounty.com.ph"];

  // Cache for API responses
  const cacheRef = useRef({
    companies: null,
    expenseClass: null,
    transactionTypes: null,
    taxCodes: null,
  });

  // Debounce supplier search
  const debouncedSupplierSearch = useDebounce(supplierSearch, 500);
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const previousAccrualWindowLockedRef = useRef(true);

  // Track previous search values to prevent duplicate requests
  const prevSupplierSearchRef = useRef("");
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

          const [expenseList, transactionList, taxList, companiesList] = await Promise.all([
            getExpenseClassNames(),
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
            transactionTypes: transactionList,
            taxCodes: taxList,
          };

          setCompanies(companiesList);
          setExpenseClass(expenseList);
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
      setAccrualSetup({
        start_date: setup.start_date || "",
        cutoff_date: setup.cutoff_date || "",
      });
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

    const intervalId = window.setInterval(() => {
      refreshSetupIfVisible();
    }, 30000);

    window.addEventListener("focus", refreshSetupIfVisible);
    document.addEventListener("visibilitychange", refreshSetupIfVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshSetupIfVisible);
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
          table: "accrual_setup",
        },
        (payload) => {
          const nextRow = payload?.new || payload?.old;
          if (!nextRow) {
            void loadAccrualSetup({ silent: true });
            return;
          }

          setAccrualSetup({
            start_date: nextRow.start_date || "",
            cutoff_date: nextRow.cutoff_date || "",
          });
          setAccrualSetupError("");
          setAccrualSetupLoading(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(setupChannel);
    };
  }, [loadAccrualSetup]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextDraft = {
      headerInfo,
      supplierSearch,
      lineItems: lineItems.map((item) => ({
        id: item.id,
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

    if (!hasDraftContent(nextDraft)) {
      clearAccrualDraft();
      return;
    }

    window.localStorage.setItem(ACCRUAL_DRAFT_STORAGE_KEY, JSON.stringify(nextDraft));
  }, [headerInfo, supplierSearch, lineItems, lineItemCounter]);

  // Supplier search
  useEffect(() => {
    if (!headerInfo.company || debouncedSupplierSearch.length < 2) return;

    const searchKey = `${headerInfo.company}-${debouncedSupplierSearch}-${supplierPage}`;
    if (prevSupplierSearchRef.current === searchKey) return;

    prevSupplierSearchRef.current = searchKey;
    let cancelled = false;

    const fetchSuppliers = async () => {
      try {
        const { suppliers: fetchedSuppliers, total } = await getSuppliers(
          headerInfo.company,
          debouncedSupplierSearch,
          supplierPage,
          supplierLimit
        );

        if (cancelled) return;

        setSuppliers(prev =>
          supplierPage === 1
            ? fetchedSuppliers
            : [...prev, ...fetchedSuppliers]
        );
        setSupplierTotal(total);
      } catch (err) {
        console.warn("Supplier fetch failed", err);
      }
    };

    fetchSuppliers();

    return () => {
      cancelled = true;
    };
  }, [headerInfo.company, debouncedSupplierSearch, supplierPage]);

  // GL Account search handler
  const handleGLSearchChange = useCallback((lineId, value) => {
    setLineItems(prev =>
      prev.map(li =>
        li.id === lineId
          ? { ...li, glSearch: value, glPage: 1, showGLDropdown: value.length >= 2 }
          : li
      )
    );
  }, []);

  // Fetch GL accounts
  useEffect(() => {
    if (!headerInfo.company) return;

    const linesToFetch = lineItems.filter(
      li => li.glSearch && li.glSearch.length >= 2
    );

    if (linesToFetch.length === 0) return;

    const fetchGLForLines = async () => {
      for (const line of linesToFetch) {
        const searchKey = `${headerInfo.company}-${line.glSearch}-${line.glPage}`;
        
        if (prevGLSearchesRef.current[line.id] === searchKey) {
          continue;
        }

        prevGLSearchesRef.current[line.id] = searchKey;

        try {
          const { glAccounts: fetchedGLAccounts, total } = await getGLAccounts(
            headerInfo.company,
            line.glSearch,
            line.glPage,
            50
          );

          setLineItems(prev =>
            prev.map(li =>
              li.id === line.id
                ? {
                    ...li,
                    glAccounts: line.glPage === 1 
                      ? fetchedGLAccounts 
                      : [...(li.glAccounts || []), ...fetchedGLAccounts],
                    glTotal: total,
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
  }, [headerInfo.company]);

  // Profit Center search handler
  const handleProfitSearchChange = useCallback((lineId, value) => {
    setLineItems(prev =>
      prev.map(li =>
        li.id === lineId
          ? { ...li, profitSearch: value, profitPage: 1, showProfitDropdown: value.length >= 2 }
          : li
      )
    );
  }, []);

  // Fetch Profit Centers
  useEffect(() => {
    if (!headerInfo.company) return;

    const linesToFetch = lineItems.filter(
      li => li.profitSearch && li.profitSearch.length >= 2
    );

    if (linesToFetch.length === 0) return;

    const fetchProfitForLines = async () => {
      for (const line of linesToFetch) {
        const searchKey = `${headerInfo.company}-${line.profitSearch}-${line.profitPage}`;
        
        if (prevProfitSearchesRef.current[line.id] === searchKey) {
          continue;
        }

        prevProfitSearchesRef.current[line.id] = searchKey;

        try {
          const { profitCenters: fetchedProfitCenters, total } = await getProfitCenters(
            headerInfo.company,
            line.profitSearch,
            line.profitPage,
            50
          );

          setLineItems(prev =>
            prev.map(li =>
              li.id === line.id
                ? {
                    ...li,
                    profitCenters: line.profitPage === 1 
                      ? fetchedProfitCenters 
                      : [...(li.profitCenters || []), ...fetchedProfitCenters],
                    profitTotal: total,
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
  }, [headerInfo.company]);

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

  const addLineItem = () => {
    const newId = lineItemCounter + 1;
    setLineItemCounter(newId);
    setLineItems((prev) => [...prev, createEmptyLineItem(newId)]);
    setLineItemErrors((prev) => [...prev, {}]);
  };

  const removeLineItem = (id) => {
    if (lineItems.length > 1) {
      setLineItems((prev) => prev.filter((item) => item.id !== id));
      setLineItemErrors((prev) => prev.slice(0, -1));
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

  const selectSupplier = (supplier) => {
    setHeaderInfo({
      ...headerInfo,
      supplier: supplier.supplier,
      supplierName: supplier.name,
    });
    setSupplierSearch(supplier.supplier);
    setShowSupplierDropdown(false);
  };

  const handleManageSuppliers = () => {
    setSupplierEnrollmentForm({
      suppliercode: headerInfo.supplier || "",
      suppliername: headerInfo.supplierName || "",
      company: headerInfo.company || "",
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

  const handleEmailChange = (value) => {
    setHeaderInfo({ ...headerInfo, email: value });
    setHeaderErrors((prev) => ({ ...prev, email: !isValidEmail(value) }));

    if (value && !value.includes("@")) {
      setEmailSuggestions(commonDomains.map((domain) => `${value}@${domain}`));
    } else {
      setEmailSuggestions([]);
    }
  };

  const selectEmailSuggestion = (suggestion) => {
    setHeaderInfo({ ...headerInfo, email: suggestion });
    setHeaderErrors((prev) => ({ ...prev, email: !isValidEmail(suggestion) }));
    setEmailSuggestions([]);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const currentAccrualWindowStatus = getAccrualWindowStatus(accrualSetup, new Date());
    if (accrualSetupLoading || !currentAccrualWindowStatus.isOpen) {
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
      const headerErrs = {};

      // Header validation
      if (!headerInfo.email || !isValidEmail(headerInfo.email)) headerErrs.email = true;
      if (!headerInfo.expenseclass) headerErrs.expenseclass = true;
      if (!headerInfo.company) headerErrs.company = true;
      if (!headerInfo.supplier) headerErrs.supplier = true;

      if (headerInfo.expenseclass !== NON_DEDUCTIBLE_EXPENSE && !headerInfo.invoiceNo) {
        headerErrs.invoiceNo = true;
      }

      setHeaderErrors(headerErrs);

      // Line item validation
      const newLineItemErrors = lineItems.map(item => {
        const errors = {};
        if (!item.grossAmount) errors.grossAmount = true;
        if (!item.transType) errors.transType = true;
        if (!item.glaccount) errors.glaccount = true;
        if (!item.remarks) errors.remarks = true;
        if (!item.profitcenter) errors.profitcenter = true;

        if (headerInfo.expenseclass !== NON_DEDUCTIBLE_EXPENSE) {
          if (!item.vat) errors.vat = true;
          if (!item.taxCode) errors.taxCode = true;
        }
        return errors;
      });

      setLineItemErrors(newLineItemErrors);

      // Check for errors
      if (
        Object.keys(headerErrs).length > 0 ||
        newLineItemErrors.some(err => Object.keys(err).length > 0)
      ) {
        showToast("Please fill in all required fields.", "error");
        return;
      }

      const controlNumber = await submitAccrual({
        header: {
          maker: currentUser?.email || headerInfo.email,
          requester_email: headerInfo.email,
          expense_class: headerInfo.expenseclass,
          company: headerInfo.company,
          supplier_code: headerInfo.supplier,
          supplier_name: headerInfo.supplierName,
          invoice_no: headerInfo.invoiceNo || null,
          status: 0,
        },
        lineItems: lineItems.map((item, index) => ({
          line_number: index + 1,
          gross_amount: Number(item.grossAmount || 0),
          glaccount_code: item.glaccount,
          glaccount_name: item.glaccountName || null,
          profitcenter_code: item.profitcenter,
          profitcenter_name: item.profitcenterName || null,
          transaction_type: item.transType,
          vat: item.vat || null,
          tax_code: item.taxCode || null,
          remarks: item.remarks,
        })),
      });

      // Success
      setModalMessage(controlNumber);
      setShowModal(true);
      showToast(`Accrual submitted successfully. Control number: ${controlNumber}`, "success");

      // Reset form
      setHeaderInfo({
        email: "",
        expenseclass: "",
        company: "",
        supplier: "",
        supplierName: "",
        invoiceNo: "",
      });

      setHeaderErrors({});
      setSupplierSearch("");
      setLineItems([createEmptyLineItem(1)]);
      setLineItemErrors([{}]);
      setLineItemCounter(1);
      clearAccrualDraft();

      prevSupplierSearchRef.current = "";
      prevGLSearchesRef.current = {};
      prevProfitSearchesRef.current = {};

    } catch (error) {
      console.error("Submission error:", error);
      showToast("Unable to submit. Please try again later.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const accrualWindowStatus = getAccrualWindowStatus(accrualSetup, new Date());
  const isAccrualWindowLocked = accrualSetupLoading || !accrualWindowStatus.isOpen;
  const isDisabled = !headerInfo.email || !headerInfo.expenseclass || staticDataLoading || isAccrualWindowLocked;
  const deadlineReminder = useMemo(() => {
    if (!accrualWindowStatus.isOpen || !accrualSetup?.cutoff_date) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoffDate = new Date(`${accrualSetup.cutoff_date}T00:00:00`);
    const diffInDays = Math.round((cutoffDate.getTime() - today.getTime()) / 86400000);

    if (diffInDays < 0 || diffInDays > 5) {
      return null;
    }

    return {
      tone: diffInDays <= 1 ? "urgent" : "warning",
      label: diffInDays <= 1 ? "Final cutoff notice" : "Upcoming cutoff",
      text:
        diffInDays === 0
          ? `Today is the last day to submit accruals before the cutoff on ${formatDisplayDate(
              accrualSetup.cutoff_date
            )}.`
          : `${diffInDays} day${diffInDays === 1 ? "" : "s"} remain before the submission cutoff on ${formatDisplayDate(
              accrualSetup.cutoff_date
            )}.`,
    };
  }, [accrualSetup?.cutoff_date, accrualWindowStatus.isOpen]);

  useEffect(() => {
    if (!onFullscreenChange) {
      return undefined;
    }

    const shouldUseFullscreen = currentUser?.usergroup !== "sysadmin" && isAccrualWindowLocked;
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
      const glCodeSet = new Set(glRows.map((row) => normalizeKey(row.glaccountcode)));
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
      const profitCenterCodeSet = new Set(profitCenterRows.map((row) => normalizeKey(row.profitcentercode)));
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
        const invoiceNo = normalizeValue(row.invoice_no);
        const grossAmount = normalizeValue(row.gross_amount);
        const glCode = normalizeValue(row.glaccount_code);
        const glName = normalizeValue(row.glaccount_name);
        const profitCenterCode = normalizeValue(row.profitcenter_code);
        const profitCenterName = normalizeValue(row.profitcenter_name);
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
          glName,
          profitCenterCode,
          profitCenterName,
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

        if (!supplierCode) {
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

        if (expenseClassValue && expenseClassValue !== NON_DEDUCTIBLE_EXPENSE && !invoiceNo) {
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
          const normalizedGlCode = normalizeKey(glCode);
          const glMatch =
            (companyValue && resolveCompanyCodeMatch(companyValue, glCode, glByCompanyAndCode, glByCode)) ||
            resolveAnyCodeMatch(glCode, glByCode);
          if (!glCodeSet.has(normalizedGlCode)) {
            nextRow.__errors.push("GL account does not exist");
          } else {
            nextRow.glaccount_name = glMatch?.name || glName;
          }
        }

        if (!profitCenterCode) {
          nextRow.__errors.push("Missing profit center code");
        }
        if (profitCenterCode) {
          const normalizedProfitCenterCode = normalizeKey(profitCenterCode);
          const profitCenterMatch =
            (companyValue &&
              resolveCompanyCodeMatch(
                companyValue,
                profitCenterCode,
                profitCenterByCompanyAndCode,
                profitCenterByCode
              )) ||
            resolveAnyCodeMatch(profitCenterCode, profitCenterByCode);
          if (!profitCenterCodeSet.has(normalizedProfitCenterCode)) {
            nextRow.__errors.push("Profit center does not exist");
          } else {
            nextRow.profitcenter_name = profitCenterMatch?.name || profitCenterName;
          }
        }

        if (!transactionTypeValue) {
          nextRow.__errors.push("Missing transaction type");
        } else if (!transactionTypeSet.has(normalizeKey(transactionTypeValue))) {
          nextRow.__errors.push("Transaction type does not exist");
        }

        if (expenseClassValue !== NON_DEDUCTIBLE_EXPENSE) {
          if (!vatValue) {
            nextRow.__errors.push("Missing VAT");
          } else if (!["vatable", "non-vatable"].includes(normalizeKey(vatValue))) {
            nextRow.__errors.push("VAT must be Vatable or Non-Vatable");
          }

          if (!taxCodeValue) {
            nextRow.__errors.push("Missing tax code");
          } else if (!taxCodeSet.has(normalizeKey(taxCodeValue))) {
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
    [accrualSetupLoading, accrualWindowStatus.isOpen, accrualWindowStatus.reason, currentUser]
  );

  const handleAccrualTemplateDownload = useCallback(() => {
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
          <div className="accrualClosedState sectionCard">
            <div className="accrualClosedScene" aria-hidden="true">
              <ClosedChickenIllustration />
            </div>
            <p className="accrualClosedText">
              {accrualSetupLoading
                ? "Please wait while the filing window is being checked."
                : accrualWindowStatus.reason}
            </p>
          </div>
        ) : (
          <>
        <div className="formHeader">
          <div className="formHeaderBar">
            <div>
              <h1 className="h1">New Accrual</h1>
              <p className="headerText">Fill in the year-end accrual details in a cleaner management workspace.</p>
            </div>
            <div className="formHeaderActions">
              <button
                type="button"
                className="tableActionBtn topUploadBtn"
                onClick={() => setUploadOpen(true)}
                disabled={staticDataLoading || isAccrualWindowLocked}
              >
                Upload Accruals
              </button>
              <button
                type="button"
                className="submitBtn topSubmitBtn"
                onClick={handleSubmit}
                disabled={isSubmitting || isAccrualWindowLocked}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>

        {deadlineReminder ? (
          <div className={`deadlineReminder${deadlineReminder.tone === "urgent" ? " urgent" : ""}`}>
            <div className="deadlineReminderLabel">{deadlineReminder.label}</div>
            <div className="deadlineReminderText">{deadlineReminder.text}</div>
          </div>
        ) : null}

        {/* Email & Company */}
        <div className="formSection sectionCard">
          <div className="cardHeading">
            <h2 className="cardTitle">General Information</h2>
            <p className="cardSubtitle">Set the requester, expense classification, and company details.</p>
          </div>
          <div className="formGroup">
            <label className="label">
              Email <span className="required">*</span>
            </label>
            <input
              type="email"
              className={`input ${headerErrors.email ? "inputError" : ""}`}
              placeholder="Your email"
              value={headerInfo.email}
              disabled={isAccrualWindowLocked}
              onChange={(e) => handleEmailChange(e.target.value)}
              onFocus={() => {
                if (emailSuggestions.length > 0) setEmailSuggestions(emailSuggestions);
              }}
            />
            {headerErrors.email && (
              <div className="errorText">Please enter a valid email</div>
            )}
            <FieldTip>Use your company email so the submission and future follow-ups stay traceable.</FieldTip>
            {emailSuggestions.length > 0 && (
              <div className="dropdownContainer">
                {emailSuggestions.map((sugg) => (
                  <div
                    key={sugg}
                    className="dropdownItem"
                    onClick={() => selectEmailSuggestion(sugg)}
                  >
                    {sugg}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="formGroup">
            <label className="label">
              Expense Classifications <span className="required">*</span>
            </label>
            <select
              className={`select ${headerErrors.expenseclass ? "inputError" : ""}`}
              value={headerInfo.expenseclass}
              disabled={isAccrualWindowLocked}
              onChange={(e) => {
                setHeaderInfo({ ...headerInfo, expenseclass: e.target.value });
                setHeaderErrors((prev) => ({ ...prev, expenseclass: false }));
              }}
            >
              <option value="">Choose</option>
              {expenseClass.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {headerErrors.expenseclass && (
              <div className="errorText">Expense Classification is Required</div>
            )}
            <FieldTip>Select the expense class first because it controls whether invoice, VAT, and tax code details are required.</FieldTip>
          </div>

          <div className="formGroup">
            <label className="label">
              Company Charging <span className="required">*</span>
            </label>
            <select
              className={`select ${headerErrors.company ? "inputError" : ""}`}
              disabled={isDisabled}
              value={headerInfo.company}
              onChange={(e) => {
                const newCompany = e.target.value;
                setHeaderInfo({
                  ...headerInfo,
                  company: newCompany,
                  supplier: "",
                  supplierName: "",
                });
                setSupplierSearch("");  
                setSuppliers([]); 
                setSupplierPage(1);
                prevSupplierSearchRef.current = "";
                setHeaderErrors((prev) => ({ ...prev, company: false }));
              }}
            >
              <option value="">Choose</option>
              {companies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {headerErrors.company && (
              <div className="errorText">Company Charging is Required</div>
            )}
            <FieldTip>The selected company also filters the supplier, GL account, and profit center options below.</FieldTip>
          </div>
        </div>

        {/* Supplier */}
        <div className="formSection sectionCard">
          <div className="cardHeading">
            <h2 className="cardTitle">Supplier Information</h2>
            <p className="cardSubtitle">Search the supplier master and confirm the selected vendor.</p>
          </div>
          <div className="formGroup" style={{ position: "relative" }}>
            <div className="labelRow">
              <label className="label">
                Supplier <span className="required">*</span>
              </label>
              <button
                type="button"
                className="missingSupplierLink"
                onClick={handleManageSuppliers}
                disabled={isAccrualWindowLocked}
              >
                Request Supplier Enrollment
              </button>
            </div>
            <input
              type="text"
              className={`input ${headerErrors.supplier ? "inputError" : ""}`}
              placeholder="Type to search supplier..."
              value={supplierSearch}
              onChange={(e) => {
                setSupplierSearch(e.target.value);
                setSupplierPage(1);
                setShowSupplierDropdown(e.target.value.length >= 2);
                setHeaderErrors((prev) => ({ ...prev, supplier: false }));
              }}
              onFocus={() => setShowSupplierDropdown(supplierSearch.length >= 2)}
              disabled={isDisabled}
            />
            {headerErrors.supplier && (
              <div className="errorText">Supplier is Required.</div>
            )}
            <FieldTip>Search by supplier code or vendor name. If the supplier is missing, use the enrollment request instead of typing a temporary value.</FieldTip>
            {showSupplierDropdown && supplierSearch.length >= 2 && (
              <div className="dropdownContainer">
                {suppliers.map((s) => (
                  <div
                    key={s.supplier}
                    className="dropdownItem"
                    onClick={() => selectSupplier(s)}
                  >
                    {s.supplier} - {s.name}
                  </div>
                ))}

                {suppliers.length < supplierTotal && (
                  <div
                    className="dropdownLoadMore"
                    onClick={() => setSupplierPage((prev) => prev + 1)}
                  >
                    Load more...
                  </div>
                )}

                {suppliers.length === 0 && (
                  <div className="dropdownEmpty">
                    No supplier found matching "{supplierSearch}"
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="formGroup">
            <label className="label">Supplier Name</label>
            <input
              type="text"
              className="inputDisabled"
              value={headerInfo.supplierName}
              disabled
            />
          </div>
        </div>

        {/* Invoice No */}
        <div className="formSection sectionCard">
          <div className="cardHeading">
            <h2 className="cardTitle">Invoice Details</h2>
            <p className="cardSubtitle">Capture the invoice reference tied to this accrual request.</p>
          </div>
          <div className="formGroup">
            <label className="label">
              Invoice No. <span className="required">*</span>
            </label>
            <input
              type="text"
              className={`input ${headerErrors.invoiceNo ? "inputError" : ""}`}
              disabled={isDisabled}
              placeholder="Enter invoice number"
              value={headerInfo.invoiceNo}
              onChange={(e) => {
                setHeaderInfo({ ...headerInfo, invoiceNo: e.target.value });
                setHeaderErrors((prev) => ({ ...prev, invoiceNo: false }));
              }}
            />
            {headerErrors.invoiceNo && (
              <div className="errorText">Required</div>
            )}
            <FieldTip>Match the invoice reference to the supporting document so finance can reconcile the accrual without manual clarification.</FieldTip>
          </div>
        </div>

        {/* Line Items */}
        <div className="formSection sectionCard lineItemsPanel">
          <div className="cardHeading">
            <h2 className="cardTitle">Accrual Line Items</h2>
            <p className="cardSubtitle">Add the accounting, tax, and remarks lines for this entry.</p>
          </div>
          <div className="lineItemsHeader">
            <div className="lineItemsGuidance">
              <div className="lineItemsGuidanceTitle">Guided tips for accurate line items</div>
              <div className="lineItemsGuidanceText">
                Keep one line per accounting treatment, then use remarks to explain the business purpose or timing difference.
              </div>
            </div>
            <button
              type="button"
              className="addBtn"
              onClick={addLineItem}
              disabled={isDisabled}
            >
              + Add Line Item
            </button>
          </div>
          <div className="lineItemsContainer">
            {lineItems.map((item, index) => {
            const filteredGL = item.glAccounts || [];
            const filteredProfit = item.profitCenters || [];

            return (
              <div key={item.id} className="lineItemCard">
                <div className="lineItemHeader">
                  <div className="lineItemTitle">Line Item #{index + 1}</div>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      className="removeBtn"
                      onClick={() => removeLineItem(item.id)}
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>

                <div className="lineItemGrid">
                  {/* Gross Amount */}
                  <div className="formGroup1">
                    <label className="label">
                      Gross Amount <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className={`input ${lineItemErrors[index]?.grossAmount ? "inputError" : ""}`}
                      placeholder="0.00"
                      value={item.grossAmount}
                      disabled={isDisabled}
                      onChange={(e) => updateLineItem(item.id, "grossAmount", e.target.value)}
                    />
                    {lineItemErrors[index]?.grossAmount && (
                      <div className="errorText">Gross Amount is required</div>
                    )}
                    <FieldTip>Enter the gross value exactly as it should be accrued before any later reclassification.</FieldTip>
                  </div>

                  {/* GL Account */}
              <div className="formGroup1" style={{ position: "relative" }}>
                <label className="label">
                  GL Account <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className={`inputItem ${lineItemErrors[index]?.glaccount ? "inputError" : ""}`}
                  disabled={isDisabled}
                  placeholder="Type to search GL Account."
                  value={item.glSearch}
                  onChange={(e) => handleGLSearchChange(item.id, e.target.value)}
                  onFocus={() =>
                    setLineItems(prev =>
                      prev.map(li =>
                        li.id === item.id
                          ? { ...li, showGLDropdown: (item.glSearch || "").length >= 2 }
                          : li
                      )
                    )
                  }
                />
                {lineItemErrors[index]?.glaccount && <div className="errorText">GL Account is required</div>}
                <FieldTip>Pick the GL account that reflects the expense nature of this specific line item.</FieldTip>
                {item.showGLDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      maxHeight: 200,
                      overflowY: "auto",
                      backgroundColor: "white",
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      marginTop: 4,
                      zIndex: 1000,
                      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    }}
                  >
                    {filteredGL.length > 0 ? (
                      filteredGL.map((g) => (
                        <div
                          key={g.code}
                          onClick={() => selectGLAccount(item.id, g)}
                          style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f0f0f0" }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                        >
                          {g.code} - {g.name}
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: 12, color: "#666", fontSize: 14, fontStyle: "italic" }}>
                        No GL accounts found matching "{item.glSearch}"
                      </div>
                    )}

                    {filteredGL.length < item.glTotal && (
                      <div
                        style={{
                          padding: "8px",
                          textAlign: "center",
                          cursor: "pointer",
                          fontWeight: "500",
                          color: "#007bff",
                        }}
                        onClick={() => loadMoreGLAccounts(item.id)}
                      >
                        Load more...
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="formGroup1">
                <label className="label">GL Account Name</label>
                <input type="text" className="inputItemDisabled" value={item.glaccountName} disabled />
              </div>

              {/* PROFIT CENTER */}
              <div className="formGroup1" style={{ position: "relative" }}>
                <label className="label">
                  Profit Center Code <span className="required">*</span>
                </label>
                <input
                  type="text"
                  disabled={isDisabled}
                  className={`inputItem ${lineItemErrors[index]?.profitcenter ? "inputError" : ""}`}
                  placeholder="Type to search Profit Center Code."
                  value={item.profitSearch}
                  onChange={(e) => handleProfitSearchChange(item.id, e.target.value)}
                  onFocus={() =>
                    setLineItems(prev =>
                      prev.map(li =>
                        li.id === item.id
                          ? { ...li, showProfitDropdown: (item.profitSearch || "").length >= 2 }
                          : li
                      )
                    )
                  }
                />
                {lineItemErrors[index]?.profitcenter && <div className="errorText">Profit Center is required</div>}
                <FieldTip>Use the profit center that owns the cost so reporting lands in the correct operational area.</FieldTip>
                {item.showProfitDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      maxHeight: 200,
                      overflowY: "auto",
                      backgroundColor: "white",
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      marginTop: 4,
                      zIndex: 1000,
                      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    }}
                  >
                    {filteredProfit.length > 0 ? (
                      filteredProfit.map((p) => (
                        <div
                          key={p.code}
                          onClick={() => selectProfitCenter(item.id, p)}
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            borderBottom: "1px solid #f0f0f0",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                        >
                          {p.code} - {p.name}
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: 12, color: "#666", fontSize: 14, fontStyle: "italic" }}>
                        No Profit Center found matching "{item.profitSearch}"
                      </div>
                    )}

                    {filteredProfit.length < item.profitTotal && (
                      <div
                        style={{
                          padding: "8px",
                          textAlign: "center",
                          cursor: "pointer",
                          fontWeight: "500",
                          color: "#007bff",
                        }}
                        onClick={() => loadMoreProfitCenters(item.id)}
                      >
                        Load more...
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="formGroup1">
                <label className="label">Profit Center Name</label>
                <input type="text" className="inputItemDisabled" value={item.profitcenterName} disabled />
              </div>

              {/* Transaction Type */}
              <div className="formGroup1">
                <label className="label"> Transaction Type <span className="required">*</span> </label>
                <select
                  className={`select ${lineItemErrors[index]?.transType ? "inputError" : ""}`}
                  value={item.transType}
                  disabled={isDisabled}
                  onChange={(e) => {
                    updateLineItem(item.id, "transType", e.target.value);
                    setLineItemErrors(prev => prev.map((err, i) => i === index ? { ...err, transType: false } : err));
                  }}
                >
                  <option value="">Choose</option>
                  {transactionTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {lineItemErrors[index]?.transType && <div className="errorText">Transaction Type is required</div>}
                <FieldTip>Choose the transaction type that best matches the source document or accrual scenario.</FieldTip>
              </div>

              {headerInfo.expenseclass !== NON_DEDUCTIBLE_EXPENSE && (
                <>
                  {/* VAT */}
                  <div className="formGroup1">
                    <label className="label"> VAT <span className="required">*</span> </label>
                    <select
                      className={`select ${lineItemErrors[index]?.vat ? "inputError" : ""}`}
                      value={item.vat}
                      disabled={isDisabled}
                      onChange={(e) => {
                        updateLineItem(item.id, "vat", e.target.value);
                        setLineItemErrors(prev => prev.map((err, i) => i === index ? { ...err, vat: false } : err));
                      }}
                    >
                      <option value="">Choose</option>
                      <option value="Vatable">Vatable</option>
                      <option value="Non-Vatable">Non-Vatable</option>
                    </select>
                    {lineItemErrors[index]?.vat && <div className="errorText">VAT is required</div>}
                    <FieldTip>VAT selection should match the tax treatment of the underlying invoice or receipt.</FieldTip>
                  </div>

                  {/* Tax Code */}
                  <div className="formGroup1">
                    <label className="label"> Tax Code <span className="required">*</span> </label>
                    <select
                      className={`select ${lineItemErrors[index]?.taxCode ? "inputError" : ""}`}
                      value={item.taxCode}
                      disabled={isDisabled}
                      onChange={(e) => {
                        updateLineItem(item.id, "taxCode", e.target.value);
                        setLineItemErrors(prev => prev.map((err, i) => i === index ? { ...err, taxCode: false } : err));
                      }}
                    >
                      <option value="">Choose</option>
                      {taxCodes.map((tc) => <option key={tc} value={tc}>{tc}</option>)}
                    </select>
                    {lineItemErrors[index]?.taxCode && <div className="errorText">Tax Code is required</div>}
                    <FieldTip>Choose the tax code used by your finance team for posting and reporting this type of expense.</FieldTip>
                  </div>
                </>
              )}

              <div className="formGroup1">
                <label className="label">Remarks <span className="required">*</span> </label>
                <textarea
                  className={`input ${lineItemErrors[index]?.remarks ? "inputError" : ""}`}
                  rows={2}
                  disabled={isDisabled}
                  value={item.remarks}
                  onChange={(e) => updateLineItem(item.id, "remarks", e.target.value)}
                ></textarea>
                {lineItemErrors[index]?.remarks && <div className="errorText">Remarks are required</div>}
                <FieldTip>Briefly state what is being accrued and why the amount still needs to be recognized at year-end.</FieldTip>
              </div>
            </div>
          </div>
        );
      })}
          </div>
          
    </div>

    <div className="formFooter">
      <button
        type="button"
        className="submitBtn"
        onClick={handleSubmit}
        disabled={isSubmitting || isAccrualWindowLocked}
        style={{
          opacity: isSubmitting || isAccrualWindowLocked ? 0.6 : 1,
          cursor: isSubmitting || isAccrualWindowLocked ? "not-allowed" : "pointer",
        }}
      >
        {isSubmitting ? "Submitting..." : "Submit"}
      </button>
    </div>
          </>
        )}

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
              Cancel
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
      <div className="modalOverlay">
        <div className="modalContent">
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              boxShadow: "0 4px 12px rgba(76, 175, 80, 0.3)",
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2
            style={{
              margin: "0 0 12px 0",
              fontSize: "24px",
              fontWeight: "500",
              color: "#202124",
              fontFamily: "'Google Sans', sans-serif",
            }}
          >
            Thank you for submitting!
          </h2>
          <p
            style={{
              margin: "0 0 8px 0",
              fontSize: "14px",
              color: "#5f6368",
              lineHeight: "1.6",
            }}
          >
            This is your Accrual Template control number:
          </p>
          <div
            style={{
              fontSize: "36px",
              fontWeight: "bold",
              color: "#202124",
              margin: "16px 0 24px 0",
              fontFamily: "'Google Sans', sans-serif",
              letterSpacing: "2px",
            }}
          >
            {modalMessage}
          </div>
          <p
            style={{
              margin: "0 0 32px 0",
              fontSize: "13px",
              color: "#5f6368",
              lineHeight: "1.6",
            }}
          >
            Kindly note it in the upper-right corner of your printed RFP/GRPO for easier tracking. Thank you!
          </p>
          <button
            onClick={() => setShowModal(false)}
            className="submitBtn"
            style={{
              width: "100%",
              padding: "12px 24px",
              fontSize: "15px",
            }}
          >
            Close
          </button>
        </div>
      </div>
    )}

    <UploadDataDialog
      open={uploadOpen}
      title="Upload Accruals"
      description="Upload accrual submissions in bulk using a CSV file."
      templateColumns={ACCRUAL_UPLOAD_COLUMNS}
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
      templateDownloadHandler={handleAccrualTemplateDownload}
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

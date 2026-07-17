"use client";

import { useState } from "react";
import { Gavel, KeyRound, Plus, ScanText, Trash2 } from "lucide-react";

import type {
  AuctionEventData,
  AuctionImportAnalyzedData,
  AuctionLotMode,
  Product,
} from "@/lib/api/contracts";
import {
  analyzeAuctionImport,
  createAuctionEvent,
  getAdminProducts,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/errors";
import { formatMoney } from "@/lib/format";

const lotModeLabels: Record<AuctionLotMode, string> = {
  bundle: "묶음(전체 1 lot)",
  per_product: "상품 종류별 1 lot",
  per_unit: "1개 단위 lot (최대 100 lot)",
};

type EventItemDraft = { product_id: string; quantity: number };

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function AuctionEventsAdminClient() {
  const [key, setKey] = useState("");
  const [verified, setVerified] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [sourceText, setSourceText] = useState("");
  const [analysis, setAnalysis] = useState<AuctionImportAnalyzedData>();
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMessage, setAnalyzeMessage] = useState("");

  const [eventName, setEventName] = useState("");
  const [lotMode, setLotMode] = useState<AuctionLotMode>("per_product");
  const [items, setItems] = useState<EventItemDraft[]>([]);
  const [created, setCreated] = useState<AuctionEventData>();

  const auctionProducts = products.filter(
    (product) => product.active && product.purchase_method !== "fixed_price",
  );

  const verify = async () => {
    if (!key || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const data = await getAdminProducts(key);
      setProducts(data);
      setVerified(true);
    } catch {
      setVerified(false);
      setMessage("관리자 인증 또는 상품 목록 조회에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const analyzeText = async () => {
    if (!sourceText.trim() || analyzing) return;
    setAnalyzing(true);
    setAnalyzeMessage("");
    try {
      const result = await analyzeAuctionImport(key, { source_text: sourceText });
      setAnalysis(result);
    } catch (error) {
      setAnalysis(undefined);
      setAnalyzeMessage(
        error instanceof ApiError ? error.message : "분석에 실패했습니다.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      ACCEPTED_IMAGE_TYPES.includes(file.type),
    );
    event.target.value = "";
    if (!files.length || analyzing) return;
    setAnalyzing(true);
    setAnalyzeMessage("");
    try {
      const images = await Promise.all(
        files.map(async (file) => ({
          filename: file.name,
          content_type: file.type,
          data_base64: await fileToBase64(file),
        })),
      );
      const result = await analyzeAuctionImport(key, { images });
      setAnalysis(result);
    } catch (error) {
      setAnalysis(undefined);
      setAnalyzeMessage(
        error instanceof ApiError && error.httpStatus === 503
          ? "이미지 분석기가 설정되지 않았거나 사용할 수 없습니다."
          : error instanceof ApiError
            ? error.message
            : "이미지 분석에 실패했습니다.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const adoptSuggestions = () => {
    if (!analysis) return;
    setItems(
      analysis.suggested_event_items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
    );
    setMessage("분석 결과를 이벤트 품목으로 가져왔습니다. 검토 후 이벤트를 생성해 주세요.");
  };

  const updateItem = (index: number, patch: Partial<EventItemDraft>) => {
    setItems((previous) =>
      previous.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const duplicateIds = new Set(
    items
      .map((item) => item.product_id)
      .filter((id, index, all) => id && all.indexOf(id) !== index),
  );
  const itemsInvalid =
    !items.length ||
    items.some((item) => !item.product_id || item.quantity < 1) ||
    duplicateIds.size > 0 ||
    (lotMode === "per_unit" && totalQuantity > 100);

  const create = async () => {
    if (busy || itemsInvalid) return;
    setBusy(true);
    setMessage("");
    try {
      const event = await createAuctionEvent(key, {
        name: eventName.trim(),
        lot_mode: lotMode,
        items,
      });
      setCreated(event);
      setMessage(`경매 이벤트를 생성했습니다. lot ${event.lots.length}개가 만들어졌습니다.`);
    } catch (error) {
      setMessage(
        error instanceof ApiError ? error.message : "경매 이벤트를 생성하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (!verified)
    return (
      <section className="card">
        <KeyRound aria-hidden="true" />
        <h2>관리자 API 키</h2>
        <p>키는 현재 화면의 메모리에만 보관되며 저장하지 않습니다.</p>
        <div className="field">
          <label htmlFor="admin-auction-key">API 키</label>
          <input
            id="admin-auction-key"
            type="password"
            autoComplete="current-password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
          />
        </div>
        {message && (
          <div className="notice error" role="alert">
            {message}
          </div>
        )}
        <button className="button primary" disabled={!key || busy} onClick={verify}>
          {busy ? "확인 중…" : "키 확인 및 상품 조회"}
        </button>
      </section>
    );

  return (
    <>
      <section className="card">
        <h2>
          <ScanText size={18} aria-hidden="true" /> 경매 재고 가져오기 (검토 전용)
        </h2>
        <p className="muted">
          텍스트 또는 이미지 중 한 가지만 보내 분석합니다. 이 기능은 상품이나 이벤트를
          만들지 않으며, 결과를 검토한 뒤 아래 이벤트 생성에 사용합니다. 이미지는 서버에
          저장되지 않습니다.
        </p>
        <div className="field">
          <label htmlFor="auction-import-text">
            품목 텍스트 (한 줄에 하나: 이름, 이름, 수량, 이름 | 수량, 이름 x 수량)
          </label>
          <textarea
            id="auction-import-text"
            rows={5}
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            placeholder={"포켓몬 카드 A x 3\n유희왕 카드 B | 2\n# 주석은 무시됩니다"}
          />
        </div>
        <div className="actions">
          <button
            className="button primary"
            disabled={analyzing || !sourceText.trim()}
            onClick={analyzeText}
          >
            {analyzing ? "분석 중…" : "텍스트 분석"}
          </button>
          <label className="button" style={{ cursor: "pointer" }}>
            이미지 분석 (JPEG/PNG/WebP)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              style={{ display: "none" }}
              onChange={analyzeImages}
              disabled={analyzing}
            />
          </label>
        </div>
        {analyzeMessage && (
          <div className="notice error" role="alert">
            {analyzeMessage}
          </div>
        )}
        {analysis && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>원본</th>
                    <th>상품명</th>
                    <th>수량</th>
                    <th>신뢰도</th>
                    <th>매칭</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.results.map((result, index) => (
                    <tr key={`${result.source}-${index}`}>
                      <td>{result.source}</td>
                      <td>{result.product_name}</td>
                      <td>{result.quantity}</td>
                      <td>{Math.round(result.confidence * 100)}%</td>
                      <td>
                        {result.match_status === "matched" ? "일치" : "미일치"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className="button"
              disabled={!analysis.suggested_event_items.length}
              onClick={adoptSuggestions}
            >
              일치 품목 {analysis.suggested_event_items.length}건을 이벤트 품목으로 가져오기
            </button>
          </>
        )}
      </section>

      <section className="card">
        <h2>
          <Gavel size={18} aria-hidden="true" /> 경매 이벤트 생성
        </h2>
        <p className="muted">
          활성 경매 상품만 배정할 수 있으며 같은 상품은 동시에 둘 이상의 활성 이벤트에
          들어갈 수 없습니다. bundle은 구성 상품의 경매 설정이 모두 같아야 합니다.
        </p>
        <div className="lookup-grid">
          <div className="field">
            <label htmlFor="auction-event-name">이벤트 이름</label>
            <input
              id="auction-event-name"
              value={eventName}
              onChange={(event) => setEventName(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="auction-lot-mode">lot 생성 방식</label>
            <select
              id="auction-lot-mode"
              value={lotMode}
              onChange={(event) => setLotMode(event.target.value as AuctionLotMode)}
            >
              {Object.entries(lotModeLabels).map(([mode, label]) => (
                <option key={mode} value={mode}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {items.map((item, index) => (
          <div className="lookup-grid" key={index}>
            <div className="field">
              <label htmlFor={`event-item-product-${index}`}>상품</label>
              <select
                id={`event-item-product-${index}`}
                value={item.product_id}
                onChange={(event) => updateItem(index, { product_id: event.target.value })}
              >
                <option value="">상품 선택</option>
                {auctionProducts.map((product) => (
                  <option key={product.product_id} value={product.product_id}>
                    {product.product_name} (가용 {product.available_quantity},{" "}
                    {formatMoney(product.unit_price)})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`event-item-quantity-${index}`}>수량</label>
              <input
                id={`event-item-quantity-${index}`}
                type="number"
                min="1"
                value={item.quantity}
                onChange={(event) =>
                  updateItem(index, { quantity: Number(event.target.value) })
                }
              />
            </div>
            <div className="field">
              <label>&nbsp;</label>
              <button
                className="button danger"
                type="button"
                onClick={() => setItems(items.filter((_, i) => i !== index))}
              >
                <Trash2 size={15} /> 삭제
              </button>
            </div>
          </div>
        ))}
        <div className="actions">
          <button
            className="button"
            type="button"
            onClick={() => setItems([...items, { product_id: "", quantity: 1 }])}
          >
            <Plus size={17} /> 품목 추가
          </button>
        </div>
        {duplicateIds.size > 0 && (
          <p className="error-text">같은 상품을 중복으로 배정할 수 없습니다.</p>
        )}
        {lotMode === "per_unit" && totalQuantity > 100 && (
          <p className="error-text">
            per_unit 방식은 총 수량 100개(최대 100 lot)까지만 가능합니다.
          </p>
        )}
        {message && (
          <div
            className={message.includes("했습니다") ? "notice success" : "notice error"}
            role="status"
          >
            {message}
          </div>
        )}
        <button className="button primary" disabled={busy || itemsInvalid} onClick={create}>
          {busy ? "생성 중…" : "경매 이벤트 생성"}
        </button>
        {created && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>lot ID</th>
                  <th>제목</th>
                  <th>품목</th>
                </tr>
              </thead>
              <tbody>
                {created.lots.map((lot) => (
                  <tr key={lot.lot_id}>
                    <td>{lot.lot_id}</td>
                    <td>{lot.title || "-"}</td>
                    <td>
                      {lot.items
                        .map((item) => `${item.product_name} × ${item.quantity}`)
                        .join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted">
              공개 페이지: /auction-events/{created.event_id}
            </p>
          </div>
        )}
      </section>
    </>
  );
}

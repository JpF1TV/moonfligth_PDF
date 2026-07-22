import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import { WorkOrder } from '../types';

// Importar logo como asset — Vite lo resuelve a una URL válida en runtime
import logoMoon from '../assets/logo-moon.png';

/* ═══════════════════════════════════════════════════════════════════════════════
   Estilos MCM-002 – Orden de Trabajo (compactos para 1 sola página)
   ═══════════════════════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
  /* ── Página ───────────────────────────────────────────────────── */
  page: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 30,
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#000',
  },

  /* ── Encabezado principal ─────────────────────────────────────── */
  headerRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
  },
  logoCell: {
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRightWidth: 1,
    borderRightColor: '#000',
  },
  logoImage: {
    width: 100,
    height: 45,
    objectFit: 'contain',
  },
  titleCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#000',
    paddingHorizontal: 8,
  },
  titleText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    textAlign: 'center',
  },
  codeCell: {
    width: 100,
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  codeText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    marginBottom: 2,
  },

  /* ── Fila OT ──────────────────────────────────────────────────── */
  otRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000',
  },
  otCell: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#000',
  },
  otCellLast: {
    flex: 1.5,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },

  /* ── Barra de sección (AERONAVE, COMPONENTE, etc.) ────────────── */
  sectionBar: {
    backgroundColor: '#000',
    paddingVertical: 2,
    alignItems: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000',
  },
  sectionBarText: {
    color: '#fff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },

  /* ── Filas de datos ───────────────────────────────────────────── */
  dataRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000',
  },
  dataCell: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#000',
  },
  dataCellLast: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  label: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    marginBottom: 1,
  },
  value: {
    fontSize: 8,
    overflow: 'hidden',
  },

  /* ── Descripción de la tarea ──────────────────────────────────── */
  taskBox: {
    minHeight: 90,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000',
    padding: 8,
  },
  taskText: {
    fontSize: 9,
    lineHeight: 1.4,
  },

  /* ── Generado por ─────────────────────────────────────────────── */
  genRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  genText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  pageRef: {
    fontSize: 7,
  },

  /* ── Certificación / Aprobación ───────────────────────────────── */
  certBox: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  certText: {
    fontSize: 8,
    lineHeight: 1.4,
  },
  certTextBold: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    lineHeight: 1.4,
  },

  /* ── Fechas ───────────────────────────────────────────────────── */
  datesRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000',
  },
  dateCell: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#000',
  },
  dateCellLast: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  /* ── Firmas ───────────────────────────────────────────────────── */
  signaturesRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000',
    minHeight: 70,
  },
  signatureCell: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#000',
  },
  signatureCellLast: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  signatureTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    marginBottom: 4,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    width: 180,
    marginTop: 25,
    marginBottom: 3,
  },
  signatureLabel: {
    fontSize: 7,
  },

  /* ── Fila cierre TT/TC/TSN/CSN ────────────────────────────────── */
  closingRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000',
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  closingText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    marginRight: 30,
  },
});

/* ═══════════════════════════════════════════════════════════════════════════════
   Props
   ═══════════════════════════════════════════════════════════════════════════════ */
interface MCM002Props {
  workOrder: WorkOrder;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Componente MCM002Document
   ═══════════════════════════════════════════════════════════════════════════════ */
const MCM002Document: React.FC<MCM002Props> = ({ workOrder: w }) => (
  <Document>
    <Page size="LETTER" style={s.page}>

      {/* ═══════════════════ ENCABEZADO ═══════════════════ */}
      <View style={s.headerRow}>
        <View style={s.logoCell}>
          <Image style={s.logoImage} src={logoMoon} />
        </View>
        <View style={s.titleCell}>
          <Text style={s.titleText}>ORDEN DE TRABAJO</Text>
        </View>
        <View style={s.codeCell}>
          <Text style={s.codeText}>MCM-002</Text>
          <Text style={s.codeText}>Revisión: 3</Text>
          <Text style={s.codeText}>Fecha: 16-07-2026</Text>
        </View>
      </View>

      {/* ═══════════════════ FILA OT ═══════════════════ */}
      <View style={s.otRow}>
        <View style={s.otCell}>
          <Text><Text style={s.label}>OT: </Text>{w.workOrderNumber}</Text>
        </View>
        <View style={s.otCell}>
          <Text><Text style={s.label}>F. elaboración: </Text>{w.elaborationDate}</Text>
        </View>
        <View style={s.otCell}>
          <Text><Text style={s.label}>F. proyectada: </Text>{w.projectedDate}</Text>
        </View>
        <View style={s.otCellLast}>
          <Text><Text style={s.label}>Dirigida a: </Text>{w.directedTo}</Text>
        </View>
      </View>

      {/* ═══════════════════ AERONAVE ═══════════════════ */}
      <View style={s.sectionBar}>
        <Text style={s.sectionBarText}>AERONAVE</Text>
      </View>
      <View style={s.dataRow}>
        <View style={s.dataCell}>
          <Text style={s.label}>Modelo:</Text>
          <Text style={s.value}>{w.aircraftModel}</Text>
        </View>
        <View style={s.dataCell}>
          <Text style={s.label}>Matrícula:</Text>
          <Text style={s.value}>{w.aircraftRegistration}</Text>
        </View>
        <View style={s.dataCell}>
          <Text style={s.label}>S/N:</Text>
          <Text style={s.value}>{w.aircraftSerialNumber}</Text>
        </View>
        <View style={s.dataCell}>
          <Text style={s.label}>TT A/C:</Text>
          <Text style={s.value}>{w.ttAcCreation}</Text>
        </View>
        <View style={s.dataCellLast}>
          <Text style={s.label}>TC A/C:</Text>
          <Text style={s.value}>{w.tcAcCreation}</Text>
        </View>
      </View>

      {/* ═══════════════════ COMPONENTE ═══════════════════ */}
      <View style={s.sectionBar}>
        <Text style={s.sectionBarText}>COMPONENTE</Text>
      </View>
      <View style={s.dataRow}>
        <View style={s.dataCell}>
          <Text style={s.label}>Desc:</Text>
          <Text style={s.value}>{w.componentDesc}</Text>
        </View>
        <View style={s.dataCell}>
          <Text style={s.label}>P/N:</Text>
          <Text style={s.value}>{w.componentPN}</Text>
        </View>
        <View style={s.dataCell}>
          <Text style={s.label}>S/N:</Text>
          <Text style={s.value}>{w.componentSN}</Text>
        </View>
        <View style={s.dataCell}>
          <Text style={s.label}>TSN/TSO:</Text>
          <Text style={s.value}>{w.tsnTsoCreation}</Text>
        </View>
        <View style={s.dataCellLast}>
          <Text style={s.label}>CSN/CSO:</Text>
          <Text style={s.value}>{w.csnCsoCreation}</Text>
        </View>
      </View>

      {/* ═══════════════════ DESCRIPCIÓN DE LA TAREA ═══════════════════ */}
      <View style={s.sectionBar}>
        <Text style={s.sectionBarText}>DESCRIPCIÓN DE LA TAREA</Text>
      </View>
      <View style={s.taskBox}>
        <Text style={s.taskText}>{w.description}</Text>
      </View>

      {/* ═══════════════════ GENERADO POR ═══════════════════ */}
      <View style={s.genRow}>
        <Text style={s.genText}>GENERADO POR: ___________________</Text>
        <Text style={s.pageRef}>PAG 1 DE 1</Text>
      </View>

      {/* ═══════════════════ CERTIFICACIÓN DE CUMPLIMIENTO ═══════════════════ */}
      <View style={s.sectionBar}>
        <Text style={s.sectionBarText}>CERTIFICACIÓN DE CUMPLIMIENTO</Text>
      </View>
      <View style={s.certBox}>
        <Text style={s.certText}>
          CERTIFICO QUE MEDIANTE OMA OT _________, SE DIO CUMPLIMIENTO A LA OT PPAL _________ TENIENDO COMO REFERENCIA
        </Text>
        <Text style={{ fontSize: 8, marginTop: 8 }}>
          {w.omaCertRef || '___________________________________________________________________________________________________________'}
        </Text>
        {!w.omaCertRef && (
          <Text style={{ fontSize: 8, marginTop: 4 }}>
            ___________________________________________________________________________________________________________
          </Text>
        )}
        <Text style={[s.certTextBold, { marginTop: 8 }]}>
          QUEDANDO EN CONDICIÓN AERONAVEGABLE.
        </Text>
      </View>

      {/* ═══════════════════ APROBACIÓN ═══════════════════ */}
      <View style={s.sectionBar}>
        <Text style={s.sectionBarText}>APROBACIÓN</Text>
      </View>
      <View style={s.certBox}>
        <Text style={s.certText}>
          Certifico que el producto aeronáutico arriba descrito ha sido inspeccionado y/o reparado de acuerdo al Programa de Mantenimiento Rev. vigente aprobado por la UAEAC y Manuales de Fabricante y se encuentra en condiciones técnicas seguras para retornar al servicio.
        </Text>
      </View>

      {/* ═══════════════════ FECHAS ═══════════════════ */}
      <View style={s.datesRow}>
        <View style={s.dateCell}>
          <Text><Text style={s.label}>FECHA DE CUMPLIMIENTO: </Text>{w.completionDate || ''}</Text>
        </View>
        <View style={s.dateCellLast}>
          <Text><Text style={s.label}>FECHA DE RECEPCIÓN: </Text>{w.receptionDate || ''}</Text>
        </View>
      </View>

      {/* ═══════════════════ FIRMAS ═══════════════════ */}
      <View style={s.signaturesRow}>
        <View style={s.signatureCell}>
          <Text style={s.signatureTitle}>INSPECTOR DE LA OMA O PROVEEDOR DE SERVICIOS</Text>
          <View style={s.signatureLine} />
          <Text style={s.signatureLabel}>Firma y Licencia:</Text>
        </View>
        <View style={s.signatureCellLast}>
          <Text style={s.signatureTitle}>REP DE AERONAVEGABILIDAD DE MOON FLIGHTS</Text>
          <View style={s.signatureLine} />
          <Text style={s.signatureLabel}>Firma y Licencia:</Text>
        </View>
      </View>

      {/* ═══════════════════ DATOS DE CIERRE ═══════════════════ */}
      <View style={s.closingRow}>
        <Text style={s.closingText}>TT A/C: {w.ttAcCompletion ?? ''}</Text>
        <Text style={s.closingText}>TC A/C: {w.tcAcCompletion ?? ''}</Text>
      </View>
      <View style={s.closingRow}>
        <Text style={s.closingText}>TSN / TSO: {w.tsnTsoCompletion ?? ''}</Text>
        <Text style={s.closingText}>CSN / CSO: {w.csnCsoCompletion ?? ''}</Text>
      </View>

    </Page>
  </Document>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   downloadMCM002PDF – Genera blob y descarga el archivo
   ═══════════════════════════════════════════════════════════════════════════════ */
export async function downloadMCM002PDF(workOrder: WorkOrder): Promise<void> {
  const blob = await pdf(<MCM002Document workOrder={workOrder} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `MCM002_${workOrder.workOrderNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default MCM002Document;

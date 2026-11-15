/*
 * Sketsa alat uji: gambar garis SVG buatan sendiri (bukan aset luar) untuk 18 alat praktikum dan 3 kalkulator.
 * Hanya tampilan, tidak menyentuh hitungan.
 *
 * Setiap sketsa digambar dalam keadaan akhir. Animasi CSS (gaya.css, bagian "sketsa alat") memutar
 * elemen ber-kelas "a" dari keadaan awal yang ditulis lewat variabel di atribut style:
 *   --dx, --dy (geser), --r (putar), --sx, --sy (skala), --o (kedap), --t (tunda), --d (lama),
 *   --n (ulangan), --e (kurva), --asal (titik pusat), --kotak (fill-box / view-box).
 * Kelas "getar" menggoyang ke kiri-kanan, kelas "garis" menggambar garis (perlu pathLength="1").
 * Animasi hanya jalan saat figure punya kelas "main"; tanpa itu (atau dengan prefers-reduced-motion)
 * yang tampil adalah keadaan akhir.
 *
 * Pemakaian: <figure class="sketsa" data-sketsa="kadar-air"></figure>, lalu Sketsa.isi(figure) atau
 * otomatis untuk semua [data-sketsa] saat halaman siap; Sketsa.putar(figure) memutar ulang.
 */
(function (root) {
  'use strict';

  // Potongan yang sering dipakai.
  function panah(x1, y1, x2, y2) {   // garis aksen dengan kepala panah di (x2, y2)
    var a = Math.atan2(y2 - y1, x2 - x1), u = 7, s = 0.45;
    var p1 = [x2 - u * Math.cos(a - s), y2 - u * Math.sin(a - s)], p2 = [x2 - u * Math.cos(a + s), y2 - u * Math.sin(a + s)];
    return '<path class="k" d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + '"/><path class="kf" d="M' + x2 + ' ' + y2 + 'L' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) +
      'L' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1) + 'z"/>';
  }
  function label(x, y, teks, rata) { return '<text x="' + x + '" y="' + y + '"' + (rata ? ' text-anchor="' + rata + '"' : '') + '>' + teks + '</text>'; }
  function tunjuk(x1, y1, x2, y2, x, y, teks, rata) { return '<path class="ga" d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + '"/>' + label(x, y, teks, rata); }
  function lapisan(y0) {             // tiga lapis tanah di bawah muka tanah y0
    return '<rect class="t2" x="0" y="' + y0 + '" width="320" height="' + (110 - y0 + 70) + '"/>' +
      '<rect class="t" x="0" y="' + (y0 + 34) + '" width="320" height="38"/>' +
      '<rect class="td" x="0" y="' + (y0 + 72) + '" width="320" height="80"/>' +
      '<path class="g" d="M0 ' + y0 + 'H320"/><path class="g tipis h" d="M0 ' + (y0 + 34) + 'H320M0 ' + (y0 + 72) + 'H320"/>';
  }

  var S = {};

  S['kadar-air'] = {
    ket: 'Cawan berisi tanah basah ditimbang, dikeringkan di oven, lalu ditimbang lagi. Selisih beratnya adalah berat air.',
    svg: '<path class="g" d="M10 160H310"/>' +
      '<rect class="g m" x="45" y="128" width="90" height="32" rx="4"/><rect class="g p" x="72" y="136" width="36" height="12" rx="2"/><path class="g" d="M55 122H125M90 122v6"/>' +
      '<rect class="g m" x="168" y="34" width="132" height="126" rx="6"/><rect class="g p" x="180" y="46" width="108" height="82" rx="3"/><path class="g tipis" d="M180 98H288"/>' +
      '<circle class="g p" cx="196" cy="144" r="6"/><circle class="g p" cx="216" cy="144" r="6"/><path class="g tipis" d="M240 141h44M240 147h44"/>' +
      '<g class="a" style="--o:0;--t:1s;--d:.5s"><path class="k" d="M200 124q-4-5 0-9t0-9M234 124q-4-5 0-9t0-9M268 124q-4-5 0-9t0-9"/></g>' +
      '<g class="a" style="--dx:-144px;--dy:24px;--d:1s"><path class="g m" d="M211 86h46l-5 12h-36z"/><path class="t" d="M216 86q18-10 36 0z"/></g>' +
      '<g class="a" style="--o:0;--dy:8px;--t:1.3s;--d:.8s"><path class="g tipis" d="M226 76q-3-4 0-8t0-8M242 76q-3-4 0-8t0-8"/></g>' +
      label(90, 176, 'timbangan', 'middle') + label(234, 176, 'oven', 'middle')
  };

  S['berat-spesifik'] = {
    ket: 'Piknometer berisi butir tanah diisi air suling sampai tanda batas. Gelembung udara dikeluarkan dulu sebelum ditimbang.',
    svg: '<defs><clipPath id="sk-pikno"><path d="M100 18v52a46 46 0 1 0 20 0V18z"/></clipPath></defs>' +
      '<g clip-path="url(#sk-pikno)"><rect class="w a" x="40" y="30" width="140" height="150" style="--sy:0;--asal:50% 100%;--d:1.6s;--t:.2s"/>' +
      '<path class="t" d="M60 148q50-14 100 0v32H60z"/></g>' +
      '<path class="g" d="M100 18v52a46 46 0 1 0 20 0V18"/><path class="g" d="M95 18h30"/><path class="g tipis" d="M100 30h20"/>' +
      '<g class="a" style="--o:0;--dy:24px;--t:.9s;--d:1.2s"><circle class="g tipis p" cx="96" cy="128" r="3"/><circle class="g tipis p" cx="118" cy="118" r="2.5"/><circle class="g tipis p" cx="108" cy="102" r="2"/></g>' +
      tunjuk(124, 30, 184, 30, 190, 34, 'tanda batas') + tunjuk(146, 104, 184, 104, 190, 108, 'air suling') + tunjuk(140, 150, 184, 150, 190, 154, 'butir tanah')
  };

  S['hubungan-fase'] = {
    ket: 'Tanah dipisah menjadi tiga fase (udara, air, butir) supaya volume dan berat tiap fase bisa dihitung satu per satu.',
    svg: '<path class="g t2" d="M30 118q-6-34 22-46q20-22 46-4q26 6 22 38q4 30-30 34q-40 10-60-22z"/>' +
      '<circle class="g tipis t" cx="56" cy="96" r="9"/><circle class="g tipis t" cx="84" cy="88" r="7"/><circle class="g tipis t" cx="76" cy="116" r="10"/><circle class="g tipis t" cx="102" cy="108" r="6"/><circle class="g tipis t" cx="52" cy="122" r="6"/>' +
      '<path class="w" d="M64 104q6-4 10 2q-4 6-10-2zM90 100q6-2 6 6q-6 2-6-6z"/>' +
      panah(140, 100, 176, 100) +
      '<g class="a" style="--dx:-40px;--o:0;--t:.2s;--d:.6s"><rect class="g p" x="200" y="30" width="70" height="34"/>' + label(235, 51, 'udara', 'middle') + '</g>' +
      '<g class="a" style="--dx:-40px;--o:0;--t:.5s;--d:.6s"><rect class="g w" x="200" y="64" width="70" height="38"/>' + label(235, 87, 'air', 'middle') + '</g>' +
      '<g class="a" style="--dx:-40px;--o:0;--t:.8s;--d:.6s"><rect class="g t" x="200" y="102" width="70" height="54"/>' + label(235, 133, 'butir', 'middle') + '</g>' +
      '<g class="a" style="--o:0;--t:1.3s;--d:.5s">' + label(194, 51, 'V<tspan class="sub" dy="3">a</tspan>', 'end') + label(194, 87, 'V<tspan class="sub" dy="3">w</tspan>', 'end') +
      label(194, 133, 'V<tspan class="sub" dy="3">s</tspan>', 'end') + label(276, 87, 'W<tspan class="sub" dy="3">w</tspan>') + label(276, 133, 'W<tspan class="sub" dy="3">s</tspan>') + '</g>'
  };

  S.atterberg = {
    ket: 'Pasta tanah di mangkuk Casagrande diberi alur, lalu mangkuk diketukkan sampai alurnya menutup. Jumlah ketukan dicatat untuk tiap kadar air.',
    svg: '<rect class="g m" x="40" y="138" width="200" height="26" rx="3"/><path class="g" d="M70 138v-22"/><circle class="g p" cx="70" cy="112" r="4"/>' +
      '<g class="a" style="--dy:-10px;--n:4;--d:.32s;--e:cubic-bezier(.55,0,1,.45)">' +
      '<path class="g m" d="M70 112q10 26 70 26q60 0 74-26z"/><path class="t" d="M86 114q54 18 112 0z"/>' +
      '<path class="g tipis p a" d="M138 115l4 9 4-9z" style="--sx:3;--t:1.3s;--d:.5s;--n:1;--e:ease"/></g>' +
      '<circle class="g p" cx="266" cy="128" r="12"/><g class="a" style="--r:-720deg;--d:1.28s;--e:linear;--kotak:view-box;--asal:266px 128px"><path class="g" d="M266 128l9-9"/><circle class="g m" cx="275" cy="119" r="3"/></g>' +
      tunjuk(142, 112, 142, 84, 142, 78, 'alur menutup', 'middle') + label(100, 178, 'mangkuk Casagrande', 'middle') + label(266, 158, 'engkol', 'middle')
  };

  S['batas-susut'] = {
    ket: 'Tanah basah di cawan dibiarkan mengering sampai volumenya berhenti berkurang. Perubahan volume dan berat dipakai menghitung batas susut.',
    svg: '<path class="g m" d="M70 120h180l-12 26H82z"/><path class="g tipis h" d="M84 120q76-46 152 0"/>' +
      '<path class="g t a" d="M104 120q56-34 112 0z" style="--sx:1.36;--sy:1.4;--asal:50% 100%;--d:1.8s;--t:.3s"/>' +
      '<g class="a" style="--o:0;--t:1.7s;--d:.4s">' + panah(84, 102, 100, 110) + panah(236, 102, 220, 110) + '</g>' +
      tunjuk(160, 92, 160, 60, 160, 54, 'volume basah', 'middle') + label(160, 166, 'volume kering', 'middle')
  };

  (function () {
    var rak = '', nama = ['No. 4', 'No. 10', 'No. 40', 'No. 200'];
    for (var i = 0; i < 4; i++) {
      var y = 18 + i * 30;
      rak += '<rect class="g m" x="90" y="' + y + '" width="100" height="26" rx="3"/><path class="g tipis h" d="M94 ' + (y + 20) + 'H186"/>';
    }
    S.saringan = {
      ket: 'Tanah kering diayak lewat susunan saringan dari lubang terbesar ke terkecil. Berat yang tertahan di tiap saringan ditimbang.',
      svg: '<g class="getar" style="--n:7;--t:.1s">' + rak + '<path class="g m" d="M90 140h100v16q0 6-6 6H96q-6 0-6-6z"/>' +
        '<circle class="t" cx="112" cy="33" r="5"/><circle class="t" cx="130" cy="34" r="4"/><circle class="t" cx="160" cy="33" r="5.5"/>' +
        '<circle class="t" cx="118" cy="64" r="3.5"/><circle class="t" cx="150" cy="65" r="3"/><circle class="t" cx="170" cy="64" r="3.5"/>' +
        '<circle class="t" cx="124" cy="95" r="2.2"/><circle class="t" cx="140" cy="95" r="2"/><circle class="t" cx="162" cy="96" r="2.2"/>' +
        '<circle class="t" cx="132" cy="126" r="1.4"/><circle class="t" cx="150" cy="126" r="1.4"/><path class="t" d="M108 156h64v-3q-32-6-64 0z"/></g>' +
        '<g class="a" style="--dy:-34px;--o:0;--t:.3s;--d:.7s"><circle class="t" cx="146" cy="64" r="2.6"/><circle class="t" cx="128" cy="96" r="1.8"/></g>' +
        '<g class="a" style="--dy:-34px;--o:0;--t:.8s;--d:.7s"><circle class="t" cx="156" cy="96" r="1.8"/><circle class="t" cx="140" cy="127" r="1.2"/></g>' +
        nama.map(function (n, i) { return label(200, 35 + i * 30, n); }).join('') + label(200, 155, 'pan')
    };
  })();

  S.hidrometer = {
    ket: 'Hidrometer dibaca pada waktu tertentu saat butir halus mengendap. Makin lama suspensi makin encer, dan hidrometer tenggelam makin dalam.',
    svg: '<rect class="w" x="111" y="40" width="58" height="125"/><rect class="t2" x="111" y="40" width="58" height="125" style="opacity:.65"/>' +
      '<rect class="t a" x="111" y="152" width="58" height="13" style="--sy:0;--asal:50% 100%;--d:2.4s"/>' +
      '<g class="a" style="--dy:-60px;--o:.3;--d:2.4s"><circle class="t" cx="122" cy="140" r="1.6"/><circle class="t" cx="150" cy="134" r="1.6"/><circle class="t" cx="160" cy="146" r="1.6"/><circle class="t" cx="134" cy="128" r="1.6"/></g>' +
      '<path class="g" d="M110 14v146q0 6 6 6h48q6 0 6-6V14"/><path class="g tipis" d="M111 40h58"/><rect class="g m" x="100" y="166" width="80" height="8" rx="2"/>' +
      '<g class="a" style="--dy:-34px;--d:2.4s;--e:cubic-bezier(.2,.7,.3,1)"><rect class="g p" x="137" y="8" width="6" height="66"/><path class="g tipis" d="M137 22h3M137 30h3M137 38h3M137 46h3M137 54h3"/>' +
      '<path class="g m" d="M140 74c-12 0-12 6-12 26s6 26 12 26s12-6 12-26s0-26-12-26z"/></g>' +
      tunjuk(176, 30, 206, 30, 212, 34, 'hidrometer') + tunjuk(170, 90, 206, 90, 212, 94, 'suspensi tanah') + tunjuk(170, 158, 206, 158, 212, 162, 'endapan')
  };

  S.klasifikasi = {
    ket: 'LL dan PI diletakkan di bagan plastisitas. Letak titik terhadap garis A dan garis LL = 50 menentukan simbol tanah berbutir halus.',
    svg: '<path class="g" d="M40 16v144H296"/><path class="g tipis h" d="M150 20v140"/>' +
      '<path class="g garis" pathLength="1" d="M74 160L286 44" style="--d:1s;--t:.2s"/>' +
      '<g class="a" style="--o:0;--t:.9s;--d:.5s">' + label(86, 112, 'CL') + label(210, 72, 'CH') + label(110, 150, 'ML') + label(236, 136, 'MH') + label(286, 38, 'garis A', 'end') + '</g>' +
      '<circle class="kf a" cx="196" cy="84" r="5" style="--sx:0;--sy:0;--t:1.4s;--d:.45s;--e:cubic-bezier(.3,1.6,.5,1)"/>' +
      label(296, 174, 'LL', 'end') + label(34, 24, 'PI', 'end') + label(150, 174, '50', 'middle')
  };

  S.pemadatan = {
    ket: 'Tanah dengan kadar air tertentu dipadatkan lapis demi lapis di cetakan memakai penumbuk yang dijatuhkan dari tinggi tetap. Diulang untuk beberapa kadar air.',
    svg: '<rect class="g m" x="100" y="160" width="120" height="8" rx="2"/><rect class="g m" x="125" y="96" width="70" height="64"/><rect class="g m" x="128" y="76" width="64" height="20"/>' +
      '<rect class="t" x="127" y="110" width="66" height="49"/><path class="g tipis h" d="M127 126h66M127 142h66"/>' +
      '<g class="a" style="--dy:-46px;--n:3;--d:.42s;--e:cubic-bezier(.55,0,1,.45)"><rect class="g m" x="146" y="88" width="28" height="22" rx="2"/><rect class="g p" x="156" y="20" width="8" height="68"/><rect class="g m" x="150" y="10" width="20" height="12" rx="3"/></g>' +
      '<g class="a" style="--o:0;--t:1.26s;--d:.3s"><path class="k" d="M140 104l-9-5M180 104l9-5"/></g>' +
      tunjuk(176, 20, 220, 20, 226, 24, 'penumbuk') + tunjuk(195, 130, 220, 130, 226, 134, 'cetakan') + tunjuk(125, 134, 90, 134, 84, 138, 'lapis tanah', 'end')
  };

  S['sand-cone'] = {
    ket: 'Tanah digali dan ditimbang; lubangnya diisi pasir dari botol lewat corong. Volume lubang dihitung dari berat pasir yang keluar.',
    svg: '<defs><clipPath id="sk-lubang"><path d="M120 120q40 56 80 0z"/></clipPath><clipPath id="sk-botol"><rect x="124" y="8" width="72" height="56" rx="8"/></clipPath></defs>' +
      '<rect class="t2" x="0" y="120" width="320" height="60"/><path class="g p" d="M120 120q40 56 80 0z"/>' +
      '<g clip-path="url(#sk-lubang)"><rect class="ps a" x="118" y="120" width="84" height="30" style="--sy:0;--asal:50% 100%;--t:.4s;--d:2s"/></g>' +
      '<path class="g" d="M0 120h104M216 120h104"/><rect class="g m" x="104" y="114" width="112" height="6"/>' +
      '<rect class="ps a" x="158" y="74" width="4" height="62" style="opacity:0;--o:1;--d:2.4s"/>' +
      '<path class="g m" d="M126 114l26-40h16l26 40z"/><rect class="g m" x="150" y="64" width="20" height="10"/>' +
      '<g clip-path="url(#sk-botol)"><rect class="ps a" x="124" y="40" width="72" height="24" style="--sy:1.9;--asal:50% 100%;--d:2.4s"/></g>' +
      '<rect class="g" x="124" y="8" width="72" height="48" rx="8"/><path class="g" d="M146 56v8h28v-8"/>' +
      tunjuk(196, 24, 232, 24, 238, 28, 'botol pasir') + tunjuk(190, 96, 232, 96, 238, 100, 'corong') + tunjuk(176, 140, 232, 150, 238, 154, 'lubang uji')
  };

  S.cbr = {
    ket: 'Piston ditekan ke permukaan tanah dalam cetakan dengan kecepatan tetap. Beban dibaca pada penetrasi tertentu lalu dibandingkan dengan beban standar.',
    svg: '<path class="g" d="M60 168V18M220 168V18"/><rect class="g m" x="56" y="12" width="168" height="10"/><rect class="g m" x="70" y="160" width="140" height="8"/>' +
      '<rect class="g m" x="90" y="100" width="100" height="60"/><rect class="t" x="92" y="104" width="96" height="55"/><rect class="g m" x="100" y="96" width="30" height="8"/><rect class="g m" x="150" y="96" width="30" height="8"/>' +
      '<path class="g" d="M140 22v4"/><ellipse class="g p" cx="140" cy="44" rx="14" ry="18"/>' +
      '<g class="a" style="--dy:-16px;--d:1.8s;--e:linear"><rect class="g m" x="134" y="62" width="12" height="44"/></g>' +
      '<circle class="g p" cx="262" cy="60" r="20"/><path class="g tipis" d="M262 42v4M280 60h-4M244 60h4"/><path class="ga" d="M154 44h88"/>' +
      '<path class="k a" d="M262 60V47" style="--r:-220deg;--kotak:view-box;--asal:262px 60px;--d:1.8s;--e:linear"/>' +
      label(262, 96, 'arloji', 'middle') + tunjuk(134, 84, 40, 84, 34, 80, 'piston', 'end') + label(140, 182, 'cetakan + beban', 'middle')
  };

  S['permeabilitas-tetap'] = {
    ket: 'Air mengalir dari tangki bermuka air tetap melewati contoh tanah. Volume air yang tertampung dalam waktu tertentu dipakai menghitung k.',
    svg: '<defs><clipPath id="sk-ukur"><path d="M197 80v80q0 3 3 3h28q3 0 3-3V80z"/></clipPath></defs>' +
      '<rect class="g m" x="20" y="20" width="70" height="44" rx="3"/><rect class="w" x="22" y="30" width="66" height="32"/><path class="g tipis" d="M22 30h66"/><path class="g" d="M90 30h14v10"/>' +
      '<path class="g" d="M52 64v14h76v10M58 64v8h76v16"/>' +
      '<rect class="g m" x="112" y="88" width="44" height="66"/><rect class="g p tipis" x="114" y="90" width="40" height="6"/><rect class="t" x="114" y="96" width="40" height="50"/><rect class="g p tipis" x="114" y="146" width="40" height="6"/>' +
      '<path class="g" d="M156 146h52v-2M156 152h46v-2"/>' +
      '<g class="a" style="--dy:-8px;--o:0;--n:5;--d:.5s;--e:ease-in"><circle class="w g tipis" cx="214" cy="100" r="2.5"/></g>' +
      '<g clip-path="url(#sk-ukur)"><rect class="w a" x="196" y="118" width="36" height="46" style="--sy:0;--asal:50% 100%;--d:2.5s"/></g>' +
      '<path class="g" d="M197 80v80q0 3 3 3h28q3 0 3-3V80"/><path class="g tipis" d="M197 100h6M197 120h6M197 140h6"/>' +
      '<path class="ga" d="M98 30H250M160 148H250M250 30v118"/>' + label(256, 92, 'h') +
      tunjuk(55, 30, 55, 12, 55, 8, 'muka air tetap', 'middle') + tunjuk(134, 122, 90, 122, 84, 126, 'contoh tanah', 'end') + label(214, 178, 'gelas ukur', 'middle')
  };

  S['permeabilitas-turun'] = {
    ket: 'Air di pipa tegak turun dari h₁ ke h₂ saat merembes lewat contoh tanah. Waktu turunnya dipakai menghitung k.',
    svg: '<rect class="w a" x="146" y="44" width="8" height="46" style="--sy:1.85;--asal:50% 100%;--d:2.6s;--e:cubic-bezier(.3,.6,.4,1)"/>' +
      '<path class="g" d="M145 6v84M155 6v84"/>' +
      '<rect class="g m" x="128" y="90" width="44" height="60"/><rect class="g p tipis" x="130" y="92" width="40" height="6"/><rect class="t" x="130" y="98" width="40" height="44"/><rect class="g p tipis" x="130" y="142" width="40" height="6"/>' +
      '<rect class="w" x="101" y="156" width="118" height="10"/><path class="g" d="M100 150v18h120v-18"/>' +
      '<path class="ga" d="M158 8h40"/>' + label(204, 12, 'h₁') +
      '<g class="a" style="--o:0;--t:2.2s;--d:.4s"><path class="ga" d="M158 44h40"/>' + label(204, 48, 'h₂') + '</g>' +
      tunjuk(142, 70, 96, 70, 90, 74, 'pipa tegak', 'end') + tunjuk(172, 120, 210, 120, 216, 124, 'contoh tanah')
  };

  S['geser-langsung'] = {
    ket: 'Benda uji di kotak geser diberi gaya normal, lalu kotak atas didorong sampai tanah tergeser di bidang tengah.',
    svg: '<rect class="g m" x="100" y="100" width="110" height="40"/><rect class="t" x="104" y="100" width="102" height="36"/>' +
      '<g class="a" style="--dx:-18px;--d:1.6s;--t:.4s"><rect class="g m" x="118" y="60" width="110" height="40"/><rect class="t" x="122" y="64" width="102" height="36"/><rect class="g m" x="128" y="52" width="90" height="8"/>' + panah(173, 14, 173, 48) + '</g>' +
      '<g class="a" style="--o:0;--d:.4s">' + panah(70, 80, 112, 80) + '</g>' + panah(256, 120, 216, 120) +
      '<path class="g tipis h" d="M84 100H246"/>' +
      label(182, 14, 'gaya normal') + label(66, 76, 'gaya geser', 'end') + label(316, 96, 'bidang geser', 'end')
  };

  S['tekan-bebas'] = {
    ket: 'Benda uji silinder ditekan tanpa tekanan samping sampai runtuh. Beban puncak dibagi luas terkoreksi memberi qu.',
    svg: '<rect class="g m" x="110" y="150" width="100" height="10"/>' +
      '<rect class="g t a" x="138" y="30" width="44" height="120" style="opacity:0;--o:1;--d:1.6s;--e:steps(1,end)"/>' +
      '<path class="g t a" d="M138 40q-8 55 0 110h44q8-55 0-110z" style="--o:0;--d:1.6s;--e:steps(1,end)"/>' +
      '<path class="g garis" pathLength="1" d="M146 54l14 30-4 10 16 40" style="--t:1.55s;--d:.45s"/>' +
      '<g class="a" style="--dy:-10px;--d:1.6s;--e:linear"><rect class="g m" x="110" y="30" width="100" height="10"/>' + panah(160, 2, 160, 26) + '</g>' +
      label(168, 14, 'beban aksial') + tunjuk(190, 100, 228, 100, 234, 104, 'benda uji') + tunjuk(166, 116, 228, 128, 234, 132, 'bidang retak')
  };

  S['konsolidasi-lab'] = {
    ket: 'Benda uji di dalam cincin diberi beban bertahap. Penurunannya dibaca di arloji ukur pada waktu tertentu di tiap tahap beban.',
    svg: '<rect class="w" x="71" y="118" width="178" height="41"/><path class="g" d="M70 110v50h180v-50"/>' +
      '<rect class="g p tipis" x="124" y="146" width="72" height="8"/><rect class="t a" x="124" y="124" width="72" height="22" style="--sy:1.14;--asal:50% 100%;--d:2.4s"/>' +
      '<rect class="g" x="120" y="120" width="80" height="26"/><g class="a" style="--dy:-3px;--d:2.4s"><rect class="g p tipis" x="124" y="116" width="72" height="8"/><path class="g" d="M160 116V52M126 52h68"/>' +
      '<g class="a" style="--dy:-36px;--o:0;--t:.1s;--d:.45s"><rect class="g m" x="134" y="40" width="52" height="12" rx="2"/></g>' +
      '<g class="a" style="--dy:-36px;--o:0;--t:.8s;--d:.45s"><rect class="g m" x="138" y="28" width="44" height="12" rx="2"/></g>' +
      '<g class="a" style="--dy:-36px;--o:0;--t:1.5s;--d:.45s"><rect class="g m" x="142" y="16" width="36" height="12" rx="2"/></g></g>' +
      '<circle class="g p" cx="250" cy="64" r="20"/><path class="g tipis" d="M250 46v4M268 64h-4M232 64h4"/><path class="ga" d="M194 80h40"/>' +
      '<path class="k a" d="M250 64V51" style="--r:-260deg;--kotak:view-box;--asal:250px 64px;--d:2.4s"/>' +
      label(250, 100, 'arloji ukur', 'middle') + label(100, 30, 'beban bertahap', 'middle') + tunjuk(122, 150, 100, 170, 8, 174, 'cincin + batu pori')
  };

  S.sondir = {
    ket: 'Konus ditekan masuk ke tanah setiap kedalaman tertentu. Perlawanan konus dan hambatan lekat dibaca di manometer.',
    svg: lapisan(70) + '<path class="g" d="M120 70V22h80v48"/><rect class="g m" x="114" y="16" width="92" height="8"/><circle class="g p" cx="214" cy="40" r="8"/><path class="g" d="M206 40h-6"/>' +
      '<g class="a" style="--dy:-84px;--d:2.4s;--e:steps(4,end)"><rect class="g p" x="157" y="-20" width="6" height="156"/><rect class="g m" x="156" y="136" width="8" height="14"/><path class="g m" d="M156 150h8l-4 12z"/></g>' +
      '<g class="a" style="--sx:0;--asal:0% 50%;--t:.6s;--d:.3s"><rect class="kf" x="236" y="80" width="30" height="7"/></g>' +
      '<g class="a" style="--sx:0;--asal:0% 50%;--t:1.2s;--d:.3s"><rect class="kf" x="236" y="104" width="52" height="7"/></g>' +
      '<g class="a" style="--sx:0;--asal:0% 50%;--t:1.8s;--d:.3s"><rect class="kf" x="236" y="128" width="40" height="7"/></g>' +
      '<g class="a" style="--sx:0;--asal:0% 50%;--t:2.4s;--d:.3s"><rect class="kf" x="236" y="152" width="70" height="7"/></g>' +
      label(236, 64, 'q<tspan class="sub" dy="3">c</tspan>') + tunjuk(156, 156, 104, 156, 98, 160, 'konus', 'end') + label(60, 64, 'muka tanah', 'middle')
  };

  S.spt = {
    ket: 'Palu dijatuhkan berulang ke batang bor. Jumlah pukulan untuk memasukkan tabung belah sedalam tertentu dicatat sebagai N.',
    svg: lapisan(70) + '<path class="g" d="M110 70L160 6l50 64"/><circle class="g p" cx="160" cy="10" r="4"/>' +
      '<g class="a" style="--dy:-12px;--d:1.26s;--e:steps(3,end)"><path class="g tipis" d="M160 14v24"/>' +
      '<g class="a" style="--dy:-26px;--n:3;--d:.42s;--e:cubic-bezier(.55,0,1,.45)"><rect class="g m" x="148" y="38" width="24" height="20" rx="2"/></g>' +
      '<rect class="g m" x="152" y="58" width="16" height="6"/><rect class="g p" x="157" y="64" width="6" height="80"/><rect class="g m" x="154" y="144" width="12" height="22"/><path class="g m" d="M154 166h12l-2 6h-8z"/></g>' +
      '<g class="a" style="--o:0;--t:1.3s;--d:.4s">' + label(314, 40, 'N = jumlah pukulan', 'end') + '</g>' +
      tunjuk(148, 48, 104, 48, 98, 52, 'palu', 'end') + tunjuk(154, 156, 104, 156, 98, 160, 'tabung belah', 'end')
  };

  S.latihan = {
    ket: 'Soal dibangkitkan dengan angka acak, lalu jawaban dicek dan pembahasannya ditampilkan.',
    svg: '<rect class="g p" x="70" y="18" width="130" height="150" rx="4"/><path class="g tipis" d="M86 46h70M86 64h98M86 82h86M86 112h60M86 130h80"/>' +
      label(86, 36, 'Soal 3') +
      '<g class="a" style="--r:-200deg;--o:0;--sx:.4;--sy:.4;--d:.7s;--e:cubic-bezier(.3,1.4,.5,1)"><rect class="g m" x="218" y="40" width="44" height="44" rx="8"/>' +
      '<circle class="kf" cx="230" cy="52" r="3.4"/><circle class="kf" cx="240" cy="62" r="3.4"/><circle class="kf" cx="250" cy="72" r="3.4"/></g>' +
      '<path class="k garis" pathLength="1" d="M214 128l14 14 30-36" style="--t:.8s;--d:.5s"/>' +
      label(240, 100, 'angka acak', 'middle') + label(240, 164, 'dicek', 'middle')
  };

  // Kalkulator
  S['tiang-bor'] = {
    ket: 'Beban tiang bor dipikul gesekan selimut sepanjang tiang dan tahanan ujung di dasarnya.',
    svg: lapisan(46) + '<rect class="p" x="141" y="40" width="38" height="126"/><rect class="bt a" x="141" y="40" width="38" height="126" style="--sy:0;--asal:50% 100%;--d:1.1s"/>' +
      '<rect class="g" x="140" y="40" width="40" height="126"/>' +
      '<g class="a" style="--o:0;--t:1.1s;--d:.4s">' + panah(160, 4, 160, 34) + '</g>' +
      '<g class="a" style="--o:0;--dy:8px;--t:1.4s;--d:.5s">' + [72, 104, 136].map(function (y) { return panah(132, y + 12, 132, y) + panah(188, y + 12, 188, y); }).join('') + '</g>' +
      '<g class="a" style="--o:0;--dy:8px;--t:1.8s;--d:.5s">' + panah(150, 180, 150, 170) + panah(160, 180, 160, 170) + panah(170, 180, 170, 170) + '</g>' +
      label(170, 16, 'beban') + label(196, 100, 'gesekan selimut') + label(184, 178, 'tahanan ujung')
  };

  S['pondasi-dangkal'] = {
    ket: 'Pondasi dangkal menyalurkan beban ke tanah di bawahnya. Bila beban terlalu besar, tanah runtuh menurut bidang geser seperti garis berwarna.',
    svg: '<rect class="t2" x="0" y="70" width="320" height="110"/><path class="g" d="M0 70H120M200 70H320"/>' +
      '<rect class="g m" x="150" y="22" width="20" height="58"/><rect class="g m" x="120" y="78" width="80" height="16"/>' + panah(160, 0, 160, 18) +
      '<path class="g tipis h a" d="M120 94a40 26 0 0 0 80 0" style="--sx:.2;--sy:.2;--o:0;--asal:50% 0%;--t:.3s;--d:.5s"/>' +
      '<path class="g tipis h a" d="M100 94a60 44 0 0 0 120 0" style="--sx:.2;--sy:.2;--o:0;--asal:50% 0%;--t:.55s;--d:.5s"/>' +
      '<path class="g tipis h a" d="M80 94a80 64 0 0 0 160 0" style="--sx:.2;--sy:.2;--o:0;--asal:50% 0%;--t:.8s;--d:.5s"/>' +
      '<path class="k garis" pathLength="1" d="M200 94q30 56 76-24" style="--t:1.2s;--d:.7s"/><path class="k garis" pathLength="1" d="M120 94q-30 56-76-24" style="--t:1.2s;--d:.7s"/>' +
      '<path class="ga" d="M120 104h80"/>' + label(160, 116, 'B', 'middle') + '<path class="ga" d="M212 70v24"/>' + label(218, 86, 'D<tspan class="sub" dy="3">f</tspan>') + label(170, 12, 'beban')
  };

  S.konsolidasi = {
    ket: 'Timbunan menekan lapisan lempung. Air pori keluar pelan-pelan ke lapisan pasir sehingga permukaan turun sebesar s.',
    svg: '<rect class="ps" x="0" y="150" width="320" height="30"/><rect class="t a" x="0" y="95" width="320" height="55" style="--sy:1.15;--asal:50% 100%;--d:2.4s;--e:cubic-bezier(.2,.7,.3,1)"/>' +
      '<g class="a" style="--dy:-8px;--d:2.4s;--e:cubic-bezier(.2,.7,.3,1)"><rect class="ps" x="0" y="70" width="320" height="25"/><path class="g" d="M0 70H320"/><path class="g t2" d="M80 70l30-30h100l30 30z"/></g>' +
      '<path class="g tipis h" d="M0 62H60"/><path class="g tipis h" d="M0 150H320"/>' +
      '<g class="a" style="--o:0;--t:.6s;--d:.6s">' + panah(110, 118, 110, 100) + panah(210, 118, 210, 100) + panah(130, 128, 130, 146) + panah(230, 128, 230, 146) + '</g>' +
      '<path class="ga" d="M64 62v8"/>' + label(70, 68, 's') + label(160, 60, 'timbunan', 'middle') + label(300, 126, 'lempung', 'end') + label(300, 170, 'pasir', 'end') + label(300, 88, 'pasir', 'end')
  };

  // Kalkulator korelasi N-SPT memakai gambar uji SPT yang sama.
  S['korelasi-spt'] = { ket: S.spt.ket, svg: S.spt.svg };
  S['korelasi-cpt'] = { ket: S.sondir.ket, svg: S.sondir.svg };

  S['broms-lateral'] = {
    ket: 'Beban lateral P di atas muka tanah mendorong tiang. Tanah di depan tiang menahan dengan reaksi per satuan panjang; di lempung, reaksi di 1,5b teratas diabaikan.',
    svg: '<rect class="t2" x="0" y="60" width="320" height="120"/><path class="g" d="M0 60H144M160 60H320"/>' +
      '<g class="a" style="--dx:-8px;--t:.1s;--d:1s"><rect class="g m" x="144" y="26" width="16" height="140"/></g>' +
      '<g class="a" style="--o:0;--dx:-14px;--t:0s;--d:.6s">' + panah(84, 32, 140, 32) + '</g>' +
      '<g class="a" style="--o:0;--dx:12px;--t:1s;--d:.6s">' + [100, 120, 140, 160].map(function (y) { return panah(212, y, 166, y); }).join('') + '</g>' +
      '<path class="ga" d="M174 60v28"/>' + label(180, 79, '1,5b') + '<path class="ga" d="M112 32v28"/>' + label(106, 51, 'e', 'end') +
      label(84, 24, 'P') + label(218, 134, 'reaksi tanah')
  };

  function isi(fig) {
    var id = fig.getAttribute('data-sketsa'), s = S[id];
    if (!s || fig.querySelector('svg')) return !!s;
    // Versi kecil untuk kartu katalog: hanya gambar (kartu sudah berupa tautan), diputar saat kartu disorot.
    if (fig.classList.contains('sketsa-mini')) {
      fig.innerHTML = '<svg class="sk" viewBox="0 0 320 180" aria-hidden="true" focusable="false">' + s.svg.replace(/ id="sk-/g, ' id="sk-' + id + '-').replace(/url\(#sk-/g, 'url(#sk-' + id + '-') + '</svg>';
      var kartu = fig.closest('a, .kartu');
      if (kartu) {
        kartu.addEventListener('mouseenter', function () { putar(fig); });
        kartu.addEventListener('focus', function () { putar(fig); });
      }
      return true;
    }
    fig.innerHTML = '<button type="button" class="sketsa-bingkai" aria-label="Putar ulang animasi sketsa"><svg class="sk" viewBox="0 0 320 180" role="img" aria-label="Sketsa: ' + s.ket.replace(/"/g, '&quot;') + '">' + s.svg + '</svg></button>' +
      '<figcaption><span>' + s.ket + '</span><button type="button" class="tombol kecil sketsa-ulang tidak-cetak">Putar ulang</button></figcaption>';
    fig.addEventListener('click', function (e) { if (e.target.closest('button')) putar(fig); });
    return true;
  }
  function gerakDikurangi() { return root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function putar(fig) {
    if (!fig || gerakDikurangi()) return;
    fig.classList.remove('main'); void fig.offsetWidth; fig.classList.add('main');
  }
  // Putar sekali saat sketsa pertama kali terlihat (halaman kalkulator dan tab Pengantar yang terbuka).
  function amati(fig) {
    if (!('IntersectionObserver' in root)) return;
    var io = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting && !document.hidden) { io.disconnect(); putar(fig); }
    }, { threshold: 0.5 });
    io.observe(fig);
  }
  function pasangSemua() {
    Array.prototype.forEach.call(document.querySelectorAll('figure[data-sketsa]'), function (fig) {
      if (isi(fig) && !fig.closest('.panel-alat') && !fig.classList.contains('sketsa-mini')) amati(fig);
    });
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasangSemua); else pasangSemua();
  }

  root.Sketsa = { ada: function (id) { return !!S[id]; }, isi: isi, putar: putar, daftar: function () { return Object.keys(S); } };
})(this);

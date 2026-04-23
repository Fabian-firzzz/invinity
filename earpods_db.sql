-- ============================================================
-- INVINITY STORE - Database Schema
-- ============================================================
-- Versi: 2.0
-- Dibuat: 2026-04-23
-- Deskripsi: Schema lengkap dengan kategori, produk, gambar,
--            varian, orders, dan order items untuk integrasi Midtrans
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- ============================================================
-- Database: `earpods_db`
-- ============================================================

-- Hapus tabel lama (urutan: child dulu, parent terakhir)
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `product_options`;
DROP TABLE IF EXISTS `product_images`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;

-- ============================================================
-- 1. TABEL KATEGORI
-- ============================================================
CREATE TABLE `categories` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- 2. TABEL PRODUK (LENGKAP)
-- ============================================================
CREATE TABLE `products` (
  `id` VARCHAR(20) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `price` DECIMAL(12,2) NOT NULL,
  `original_price` DECIMAL(12,2) DEFAULT NULL,
  `category_id` INT(11) DEFAULT NULL,
  `stock` INT(11) DEFAULT 0,
  `image` VARCHAR(255) NOT NULL COMMENT 'Nama file gambar utama',
  `thumbnail` VARCHAR(255) DEFAULT NULL COMMENT 'Nama file thumbnail',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `fk_product_category` (`category_id`),
  CONSTRAINT `fk_product_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- 3. TABEL GAMBAR PRODUK (multiple gambar per produk)
-- ============================================================
CREATE TABLE `product_images` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `product_id` VARCHAR(20) NOT NULL,
  `image_path` VARCHAR(255) NOT NULL COMMENT 'Nama file gambar',
  `sort_order` INT(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `fk_image_product` (`product_id`),
  CONSTRAINT `fk_image_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- 4. TABEL OPSI/VARIAN PRODUK
-- ============================================================
CREATE TABLE `product_options` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `product_id` VARCHAR(20) NOT NULL,
  `option_name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_option_product` (`product_id`),
  CONSTRAINT `fk_option_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- 5. TABEL ORDERS (untuk integrasi Midtrans)
-- ============================================================
CREATE TABLE `orders` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `order_id` VARCHAR(50) NOT NULL COMMENT 'ID unik untuk Midtrans',
  `customer_name` VARCHAR(100) NOT NULL,
  `customer_phone` VARCHAR(20) NOT NULL,
  `province` VARCHAR(100) DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `district` VARCHAR(100) DEFAULT NULL,
  `postal_code` VARCHAR(10) DEFAULT NULL,
  `address_detail` TEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `payment_method` VARCHAR(50) DEFAULT NULL,
  `subtotal` DECIMAL(12,2) NOT NULL,
  `admin_fee` DECIMAL(12,2) DEFAULT 0.00,
  `grand_total` DECIMAL(12,2) NOT NULL,
  `status` ENUM('pending','settlement','expire','cancel','deny','failure') DEFAULT 'pending',
  `midtrans_transaction_id` VARCHAR(100) DEFAULT NULL,
  `snap_token` VARCHAR(255) DEFAULT NULL,
  `paid_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- 6. TABEL ORDER ITEMS
-- ============================================================
CREATE TABLE `order_items` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `order_id` VARCHAR(50) NOT NULL,
  `product_id` VARCHAR(20) NOT NULL,
  `product_name` VARCHAR(100) NOT NULL,
  `price` DECIMAL(12,2) NOT NULL,
  `quantity` INT(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `fk_orderitem_order` (`order_id`),
  KEY `fk_orderitem_product` (`product_id`),
  CONSTRAINT `fk_orderitem_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_orderitem_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- INSERT DATA AWAL
-- ============================================================

-- Kategori
INSERT INTO `categories` (`id`, `slug`, `name`, `description`) VALUES
(1, 'invinity_pro', 'Invinity Pro', 'Seri Pro dengan fitur premium dan Audio Adaptif'),
(2, 'invinity_max', 'Invinity Max', 'Seri Max untuk pengalaman audio maksimal'),
(3, 'invinity_strongest', 'Invinity Strongest', 'Seri Strongest dengan teknologi terbaik');

-- Produk (data digabungkan dari main.js + server.js, harga konsisten)
INSERT INTO `products` (`id`, `name`, `slug`, `description`, `price`, `original_price`, `category_id`, `stock`, `image`, `thumbnail`) VALUES
('pro2', 'Invinity Pro', 'invinity-pro',
 'Invinity Pro dengan Audio Adaptif, Pembatalan Bising Aktif 2x lebih baik, dan Mode Transparansi yang ditingkatkan. Pengisian MagSafe Case (USB‑C) dengan Speaker dan Loop Tali. Didesain ulang untuk pengalaman suara yang lebih imersif.',
 130000.00, 150000.00, 1, 50, 'hexa ijo.png', 'hexa item.png'),

('max', 'Invinity Max', 'invinity-max',
 'Invinity Max menghadirkan pengalaman mendengarkan personal secara menyeluruh. Pembatalan Bising Aktifnya memblokir suara dari luar, sementara Mode Transparansi membiarkan suara masuk. Audio spasial dinamis menghadirkan suara seperti di bioskop. Desain premium dengan bantalan telinga busa memori.',
 110800.00, NULL, 2, 30, '11.png', '11.png'),

('2rd', 'Invinity Strongest', 'invinity-strongest',
 'Invinity Strongest memiliki Audio Spasial Personalisasi dengan pelacakan kepala dinamis untuk menempatkan suara di sekitar Anda. Tahan air dan keringat, dengan daya tahan baterai hingga 6 jam mendengarkan. Desain berkontur baru untuk kenyamanan sepanjang hari.',
 175000.00, 190000.00, 3, 20, '12.png', '12.png');

-- Gambar produk (multiple per produk)
INSERT INTO `product_images` (`product_id`, `image_path`, `sort_order`) VALUES
('pro2', 'hexa ijo.png', 1),
('pro2', 'hexa pink.png', 2),
('pro2', 'hexa biru.png', 3),
('max', '11.png', 1),
('2rd', '12.png', 1),
('2rd', '13.png', 2);

-- Opsi/varian produk
INSERT INTO `product_options` (`product_id`, `option_name`) VALUES
('pro2', 'Sky Blue'),
('pro2', 'Pink'),
('pro2', 'Green'),
('2rd', 'Dengan Casger Pengisian MagSafe');

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

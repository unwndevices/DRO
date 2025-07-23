# Datum Binary File Format Specification

## Overview

The datum binary file format is used to store spectral data and associated parameters for the UNWN Eisei module. This format maintains compatibility between the hardware (ESP32/Daisy Seed) and VCV Rack plugin implementations.

## File Structure

The datum file consists of three main sections:

```
┌─────────────────────────────────────────────────────┐
│                 File Header                         │
│                   (160 bytes)                       │
├─────────────────────────────────────────────────────┤
│                Spectral Frames                      │
│            (variable length)                        │
└─────────────────────────────────────────────────────┘
```

## File Header (160 bytes)

The file header contains metadata and configuration parameters:

| Offset | Size | Type        | Field            | Description                           |
| ------ | ---- | ----------- | ---------------- | ------------------------------------- |
| 0x00   | 4    | char[4]     | magic            | Magic number "DATM"                   |
| 0x04   | 4    | uint32_t    | version          | Format version (currently 1)          |
| 0x08   | 4    | uint32_t    | headerSize       | Size of header (160)                  |
| 0x0C   | 20   | char[20]    | name             | Null-terminated preset name           |
| 0x20   | 4    | uint32_t    | frames           | Number of spectral frames             |
| 0x24   | 4    | uint32_t    | startFrame       | Start position in frames              |
| 0x28   | 4    | uint32_t    | endFrame         | End position in frames                |
| 0x2C   | 8    | double      | baseHz           | Base frequency for orbit              |
| 0x34   | 32   | double[4]   | phaseMultipliers | Phase multipliers for satellites A-D  |
| 0x54   | 32   | double[4]   | offsets          | Phase offsets for satellites A-D      |
| 0x74   | 8    | double      | startPoint       | Playback range start (0.0-1.0)        |
| 0x7C   | 8    | double      | endPoint         | Playback range end (0.0-1.0)          |
| 0x84   | 4    | float       | warpAmount       | Warp effect amount                    |
| 0x88   | 1    | uint8_t     | warpType         | Warp type/destination                 |
| 0x89   | 1    | uint8_t     | selectedLUT      | LUT slot number (0-7)                 |
| 0x8A   | 65   | uint8_t[65] | reserved         | Reserved for future use (zero-filled) |

**Total header size: 160 bytes**

## Spectral Data Section

Following the header, the file contains spectral frames data:

- Each frame represents a snapshot of spectral analysis
- Frame structure defined by `SpectralFrame` type in `unwn/Libs/unwndsp/FilterBank.hpp`
- Number of frames specified in header `frames` field
- Total data size = `frames * sizeof(SpectralFrame)`

## Constants

```cpp
// Magic number for file identification
static constexpr char DATUM_MAGIC[4] = {'D', 'A', 'T', 'M'};

// Current format version
static constexpr uint32_t DATUM_VERSION = 1;

// Fixed header size
static constexpr uint32_t DATUM_HEADER_SIZE = 160;
```

## Platform Implementations

### Hardware (ESP32/Daisy Seed)

- **File**: `unwn/eisei/daisy/DatumPersistence.hpp`
- **Storage**: SD card in `/DATUMS` directory
- **Format**: `.datum` file extension
- **API**: `DatumPersistence` class with SD card operations

### VCV Rack Plugin

- **File**: `src/VCVDatumPersistence.hpp`
- **Storage**: VCV Rack's standard preset locations
- **Format**: `.dat` file extension (binary data) + JSON metadata
- **API**: `VCVDatumPersistence` class with file dialog integration

## Data Types

### Orbit Parameters

- **baseHz**: Fundamental frequency for orbital calculations
- **phaseMultipliers[4]**: Phase velocity multipliers for each satellite
- **offsets[4]**: Phase offset values for each satellite
- **startPoint/endPoint**: Playback range within the recorded data (0.0-1.0)

### Warp Parameters

- **warpAmount**: Effect intensity (0.0-1.0)
- **warpType**: Warp destination/type identifier
- **selectedLUT**: Which of 8 datum slots this preset occupies

### Spectral Data

- **frames**: Number of spectral analysis frames
- **startFrame/endFrame**: Active range within the spectral data
- **SpectralFrame**: Individual spectrum snapshot (defined in FilterBank.hpp)

## File Validation

Valid datum files must:

1. Begin with magic number "DATM"
2. Have version field = 1
3. Have headerSize field = 160
4. Have file size = 160 + (frames \* sizeof(SpectralFrame))
5. Have endFrame ≥ startFrame
6. Have frames > 0

## Usage Examples

### Recording Process

1. User holds REC button or applies gate to REC input
2. Audio from MOD input is captured and analyzed
3. Spectral analysis creates array of SpectralFrame objects
4. Current orbit/warp parameters are extracted
5. File header is constructed with metadata
6. Binary file is written with header + spectral data

### Loading Process

1. File header is read and validated
2. Spectral frames are loaded into memory
3. Orbit/warp parameters are applied to engine
4. Engine's LUT is updated with new spectral data
5. UI reflects the loaded preset name and parameters

## Cross-Platform Compatibility

The binary format ensures:

- **Endianness**: Little-endian assumed on all target platforms
- **Alignment**: `__attribute__((packed))` prevents padding issues
- **Portability**: Files created on hardware can be loaded in VCV Rack and vice versa
- **Forward Compatibility**: 65-byte reserved section for future extensions

## Error Handling

Both implementations provide error codes for:

- File not found
- Invalid header/magic number
- Corrupted data
- Memory allocation failures
- Storage device errors (SD card issues on hardware)

This binary format provides efficient storage and cross-platform compatibility while maintaining all necessary data for recreating the complete Eisei module state.

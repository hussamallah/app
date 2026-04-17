import Foundation

enum BundleJSONLoaderError: Error {
    case fileNotFound(String)
    case decodeFailed(String)
}

enum BundleJSONLoader {
    static func load<T: Decodable>(_ type: T.Type, resource: String) throws -> T {
        let parts = resource.split(separator: ".")
        let name = String(parts.first ?? "")
        let ext = parts.count > 1 ? String(parts.last ?? "json") : "json"

        guard let url = Bundle.main.url(forResource: name, withExtension: ext) else {
            throw BundleJSONLoaderError.fileNotFound(resource)
        }

        do {
            let data = try Data(contentsOf: url)
            let decoder = JSONDecoder()
            return try decoder.decode(type, from: data)
        } catch {
            throw BundleJSONLoaderError.decodeFailed(error.localizedDescription)
        }
    }
}
